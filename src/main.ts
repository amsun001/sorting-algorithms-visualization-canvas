import { SortingVisualizer } from "./SortingVisualizer.js";

addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  const form = document.getElementById("sort-form") as HTMLFormElement;
  const sortBtn = document.getElementById("sort-btn") as HTMLButtonElement;

  canvas.width = 900;
  canvas.height = 600;

  const visualizer = new SortingVisualizer(canvas, form, sortBtn, 60);
  visualizer.init();
});
