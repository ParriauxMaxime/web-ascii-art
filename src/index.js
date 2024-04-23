const globals = {
  streaming: false,
  mediaOptions: {
    video: true,
    audio: false,
  },
};

const SYMBOLS = [
  '.',
  ':',
  '-',
  '=',
  '+',
  'o',
  'a',
  'j',
  'k',
  'H',
  'd',
  'p',
  'q',
  '#',
  '%',
  '@',
];
const NB_VARIANT = SYMBOLS.length;
const FONT_SIZE = 10;
const MAX_UINT8 = 256;
const FONT_SIZE_RATIO = 6;
const FRAMERATE = 60;

/**
 * Random factors from SO will do the trick
 */
function weightedAverageColor(r, g, b) {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/** This may have given better result */
// function simpleAverageColor(r, g, b) {
//   return Math.round(
//     (r + g + b) / 3,
//   );
// }

function toGreyScale(canvas, imageData, averageFct = weightedAverageColor) {
  const imgData = canvas
    .getContext('2d')
    .createImageData(canvas.width, canvas.height);
  for (let i = 0; i < imageData.width * imageData.height * 4; i += 4) {
    const mean = averageFct(
      imageData.data[i],
      imageData.data[i + 1],
      imageData.data[i + 2],
    );
    imgData.data[i] = mean;
    imgData.data[i + 1] = mean;
    imgData.data[i + 2] = mean;
    imgData.data[i + 3] = 255;
  }

  return imgData;
}

function getConvolution(imageData, imageWidth, x, y, width, height) {
  let sum = 0;
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      sum += imageData[x + i + (y + j) * imageWidth] || 0;
    }
  }
  if (Number.isNaN(Math.round(sum / (width * height)))) {
    throw new Error('This is terrible and should not happen');
  }
  return Math.round(sum / (width * height)) || 0;
}

function draw({ height, width }) {
  const canvas = document.getElementById('canvas');
  const video = document.getElementById('video');
  const text = document.getElementById('text');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const greyScale = toGreyScale(canvas, imageData);

  const closestWidth = Math.round(
    (greyScale.width) - ((greyScale.width) % FONT_SIZE_RATIO),
  );
  const closestHeight = Math.round(
    (greyScale.height) - ((greyScale.height) % FONT_SIZE),
  );
  ctx.putImageData(greyScale, 0, 0, 0, 0, closestWidth, closestHeight);
  const greyScaleImageData = ctx.getImageData(
    0,
    0,
    closestWidth,
    closestHeight,
  );
  const greyScaleSimplified = new Uint8ClampedArray(
    closestHeight * closestWidth,
  ).map((e, i) => greyScaleImageData.data[i * 4]);

  const convolutedData = [];
  for (
    let i = 0;
    i < (closestWidth / FONT_SIZE_RATIO) * (closestHeight / FONT_SIZE);
    i += 1
  ) {
    const x = (FONT_SIZE_RATIO * i) % closestWidth;
    const y = FONT_SIZE * Math.floor((FONT_SIZE_RATIO * i) / closestWidth);
    convolutedData.push(
      getConvolution(
        greyScaleSimplified,
        closestWidth,
        x,
        y,
        FONT_SIZE_RATIO,
        FONT_SIZE,
      ),
    );
  }

  const str = convolutedData
    .map((e) => SYMBOLS[Math.floor(e / (MAX_UINT8 / NB_VARIANT))])
    .join('');

  text.innerText = str;
}

let loop;

function run() {
  const video = document.querySelector('#video');
  const canvas = document.querySelector('#canvas');
  const text = document.querySelector('#text');
  const bounding = document.body.getBoundingClientRect();
  const { width } = bounding;
  let { height } = bounding;

  function onVideoPlaying() {
    if (!globals.streaming) {
      height = Math.round((width / video.videoWidth) * video.videoHeight);
      canvas.setAttribute('width', width);
      canvas.setAttribute('height', height);
      globals.streaming = true;
    }
  }

  function setAgnosticStream(stream) {
    if (navigator.mozGetUserMedia) {
      video.mozSrcObject = stream;
    } else {
      video.srcObject = stream;
    }
  }

  video.addEventListener('playing', onVideoPlaying, false);
  navigator.mediaDevices.getUserMedia(
    globals.mediaOptions,
  ).then(setAgnosticStream);

  loop = setInterval(
    () => draw({
      canvas,
      video,
      width,
      height,
      text,
    }),
    1000 / FRAMERATE,
  );
}

function debounce(func, timeout = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}
function onResize() {
  clearInterval(loop);
  document.querySelector('#text').innerText = '';
  const video = document.querySelector('#video');
  const bounding = document.body.getBoundingClientRect();
  const { width } = bounding;
  let { height } = bounding;
  height = Math.round((width / video.videoWidth) * video.videoHeight);

  const canvas = document.querySelector('#canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.setAttribute('width', width);
  canvas.setAttribute('height', height);
  run();
}

window.addEventListener(
  'resize',
  debounce(() => {
    onResize();
  }),
);

window.addEventListener('load', run);
