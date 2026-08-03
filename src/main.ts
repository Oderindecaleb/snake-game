const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (canvas) {
  canvas.width = 480;
  canvas.height = 348;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
