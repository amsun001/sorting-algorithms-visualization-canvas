/**
 * SortingVisualizer — God Object (Rung C).
 *
 * Deliberate anti-pattern for thesis Axis 1 (discrimination).
 * This single class violates the Single Responsibility Principle (Martin, 2002)
 * and exhibits Fowler's Large Class smell (Refactoring, 1999) by combining, in
 * one class, five responsibilities that Rung B (luminahi) keeps separate:
 *
 *   1. Data storage      — bar values and colors held as parallel arrays.
 *   2. Rendering         — draws bars and background directly to the canvas.
 *   3. Sorting algorithms — all five sorts implemented as private methods.
 *   4. Animation control  — timing, run state, and the sort button.
 *   5. UI / DOM handling   — reads the form and dispatches the chosen sort.
 *
 * The sorting task, algorithms, colors, and animation behavior are identical to
 * Rung B. The ONLY variable changed is architecture: many classes merged into
 * one. Do not "clean up" this file — the smell is the study object.
 */

// File-local heap used only by heapSort. Kept private (not exported) — it is a
// pure data-structure helper, not one of the architectural classes being merged.
class MinHeap {
  private array: number[];
  private size: number;
  private readonly maxSize: number;

  public constructor(maxSize: number) {
    this.array = new Array(maxSize);
    this.maxSize = maxSize;
    this.size = 0;
  }

  public insert(item: number) {
    if (this.size >= this.maxSize) {
      console.log("heap is full");
      return;
    }

    this.size++;
    this.array[this.size - 1] = item;
    this.heapifyUp(this.size - 1);
  }

  public extractMin() {
    if (this.size <= 0) {
      console.log("heap is empty");
      return -1;
    }

    const value = this.array[0];

    this.array[0] = this.array[this.size - 1];
    this.array[this.size - 1] = 0;
    this.size--;

    this.heapifyDown(0);

    return value;
  }

  private heapifyDown(index: number) {
    let smallest = index;
    const left = 2 * index + 1;
    const right = 2 * index + 2;

    if (left < this.size && this.array[left] < this.array[smallest])
      smallest = left;

    if (right < this.size && this.array[right] < this.array[smallest])
      smallest = right;

    if (smallest != index) {
      this.swapHeap(smallest, index);
      this.heapifyDown(smallest);
    }
  }

  private heapifyUp(index: number) {
    const parent: number = Math.trunc((index - 1) / 2);

    if (parent >= 0 && this.array[index] < this.array[parent]) {
      this.swapHeap(index, parent);
      this.heapifyUp(parent);
    }
  }

  private swapHeap(a: number, b: number) {
    if (!this.array[a] || !this.array[b]) return;

    const aux = this.array[a];
    this.array[a] = this.array[b];
    this.array[b] = aux;
  }

  public getArray() {
    return this.array;
  }
}

export class SortingVisualizer {
  // --- Responsibility 1: data storage (bars flattened into parallel arrays) ---
  // In Rung B each bar is an Item object that owns these fields and draws itself.
  // Here the God Object holds them directly and there is no Item class.
  private values: number[];
  private colors: string[];
  private xs: number[];
  private ys: number[];
  private readonly barWidth: number;

  // --- Responsibility 2: rendering ---
  private readonly ctx: CanvasRenderingContext2D;
  private readonly screenWidth: number;
  private readonly screenHeight: number;

  // --- Responsibility 1/3: collection sizing ---
  private readonly arraySize: number;

  // --- Responsibility 4: animation control ---
  private isRunning: boolean;
  private readonly sortBtn: HTMLButtonElement;

  // --- Responsibility 5: UI ---
  private readonly form: HTMLFormElement;

  public constructor(
    canvas: HTMLCanvasElement,
    form: HTMLFormElement,
    sortBtn: HTMLButtonElement,
    arraySize: number
  ) {
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.screenWidth = canvas.width;
    this.screenHeight = canvas.height;
    this.arraySize = arraySize;
    this.barWidth = 10;

    this.values = [];
    this.colors = [];
    this.xs = [];
    this.ys = [];

    this.isRunning = false;
    this.sortBtn = sortBtn;
    this.form = form;
  }

  // ==========================================================================
  // Responsibility 5: UI / DOM handling
  // (In Rung B this lived in main.ts and util.ts::getOptions.)
  // ==========================================================================

  public init() {
    this.paintBackground();

    this.form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (this.isRunning) {
        this.stopAnimation();
        this.paintBackground();
        return;
      }

      const { sorting, speed, mode } = this.getOptions();

      switch (mode) {
        case "asc":
          this.generateItemsAscending();
          break;
        case "desc":
          this.generateItemsDescending();
          break;
        default:
          this.generateItemsRandom();
      }

      this.run(sorting, speed);
    });
  }

  private getOptions() {
    const formData = new FormData(this.form);

    const formSpeed = (formData.get("speed") as string) ?? "1";
    const formSorting = (formData.get("sorting") as string) ?? "bubble";
    const formMode = (formData.get("mode") as string) ?? "random";

    const speed = 100 / Number.parseInt(formSpeed);
    const sorting = formSorting.valueOf();
    const mode = formMode.valueOf();

    return { speed, sorting, mode };
  }

  private run(sorting: string, speed: number) {
    this.isRunning = true;
    this.sortBtn.innerHTML = "Stop";

    switch (sorting) {
      case "selection":
        this.selectionSort(speed);
        break;
      case "insertion":
        this.insertionSort(speed);
        break;
      case "merge":
        this.mergeSortEntry(speed);
        break;
      case "heap":
        this.heapSort(speed);
        break;
      default:
        this.bubbleSort(speed);
    }
  }

  // ==========================================================================
  // Responsibility 4: animation control
  // (In Rung B this lived in ItemManager + util.ts::delay.)
  // ==========================================================================

  private stopAnimation() {
    this.sortBtn.innerHTML = "Start";
    this.isRunning = false;
  }

  private async delay(time: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }

  private swap(i: number, j: number) {
    const aux = this.values[i];
    this.values[i] = this.values[j];
    this.values[j] = aux;
  }

  // ==========================================================================
  // Responsibility 1: data storage / generation
  // (In Rung B this lived in ItemManager.generateItems*.)
  // ==========================================================================

  private resetArrays() {
    this.values = new Array(this.arraySize);
    this.colors = new Array(this.arraySize);
    this.xs = new Array(this.arraySize);
    this.ys = new Array(this.arraySize);
  }

  private placeBar(i: number, value: number) {
    this.values[i] = value;
    this.colors[i] = "white";
    this.xs[i] = 15 * i + 2;
    this.ys[i] = this.screenHeight;
  }

  public generateItemsRandom() {
    if (this.isRunning) this.stopAnimation();
    this.resetArrays();
    for (let i = 0; i < this.arraySize; i++) {
      const value = Math.ceil(Math.random() * 512);
      this.placeBar(i, value);
    }
  }

  public generateItemsDescending() {
    if (this.isRunning) this.stopAnimation();
    this.resetArrays();
    let max = this.arraySize * 10 - 5;
    for (let i = 0; i < this.arraySize; i++) {
      this.placeBar(i, max);
      max -= 10;
    }
  }

  public generateItemsAscending() {
    if (this.isRunning) this.stopAnimation();
    this.resetArrays();
    for (let i = 0; i < this.arraySize; i++) {
      const value = i * 10 + 5;
      this.placeBar(i, value);
    }
  }

  // ==========================================================================
  // Responsibility 2: rendering
  // (In Rung B this lived in ItemManager.paint* and Item.draw.)
  // ==========================================================================

  private paintBackground() {
    this.ctx.fillStyle = `rgba(0, 0, 0, 1)`;
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
  }

  private drawBar(i: number) {
    // Height is stored positive; rendered with negative height so the bar
    // grows upward from the baseline (identical convention to Rung B's Item).
    this.ctx.beginPath();
    this.ctx.fillStyle = this.colors[i];
    this.ctx.rect(this.xs[i], this.ys[i], this.barWidth, this.values[i] * -1);
    this.ctx.fill();
  }

  private paintItems() {
    this.paintBackground();
    for (let i = 0; i < this.values.length; i++) this.drawBar(i);
  }

  // ==========================================================================
  // Responsibility 3: sorting algorithms
  // (In Rung B each of these was a standalone function in src/sorting/*.)
  // ==========================================================================

  private async bubbleSort(animationSpeed: number) {
    const n = this.values.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        this.colors[i] = "blue";
        this.colors[j] = "red";

        this.paintItems();
        await this.delay(animationSpeed);
        if (!this.isRunning) return;

        this.colors[i] = "white";
        this.colors[j] = "white";

        if (this.values[i] > this.values[j]) {
          this.swap(i, j);
        }
      }
    }

    this.paintItems();
    this.stopAnimation();
  }

  private async selectionSort(animationSpeed: number) {
    const n = this.values.length;

    for (let i = 0; i < n - 1; i++) {
      let minIndex = i;
      this.colors[i] = "blue";

      for (let j = i + 1; j < n; j++) {
        this.colors[j] = "red";

        this.paintItems();
        await this.delay(animationSpeed);
        if (!this.isRunning) return;

        if (this.values[j] < this.values[minIndex]) {
          minIndex = j;
        }

        this.colors[j] = "white";
      }

      this.swap(i, minIndex);

      this.colors[i] = "white";
      this.colors[minIndex] = "white";
    }

    this.paintItems();
    this.stopAnimation();
  }

  private async insertionSort(animationSpeed: number) {
    const n = this.values.length;
    let i = 1;

    while (i < n) {
      let j = i;
      this.colors[i] = "blue";

      this.paintItems();
      await this.delay(animationSpeed);
      if (!this.isRunning) return;

      while (j > 0 && this.values[j - 1] > this.values[j]) {
        this.swap(j, j - 1);
        j--;

        this.colors[j] = "red";

        this.paintItems();
        await this.delay(animationSpeed);
        if (!this.isRunning) return;

        this.colors[j] = "white";
      }
      this.colors[i] = "white";
      i++;
    }

    this.paintItems();
    this.stopAnimation();
  }

  private async heapSort(animationSpeed: number) {
    const n = this.values.length;

    const heap = new MinHeap(n);
    for (let i = 0; i < n; i++) heap.insert(this.values[i]);

    const heapArray = heap.getArray();
    for (let i = 0; i < n; i++) {
      this.values[i] = heapArray[i];

      this.colors[i] = "blue";

      this.paintItems();
      await this.delay(animationSpeed);
      if (!this.isRunning) return;

      this.colors[i] = "white";
    }

    for (let i = 0; i < n; i++) {
      this.values[i] = heap.extractMin();

      this.colors[i] = "red";

      this.paintItems();
      await this.delay(animationSpeed);
      if (!this.isRunning) return;

      this.colors[i] = "white";
    }

    this.paintItems();
    this.stopAnimation();
  }

  // Merge sort keeps its recursive structure; entry method wraps it so the
  // run() dispatcher can call a single method (as with the other sorts).
  private async mergeSortEntry(animationSpeed: number) {
    await this.mergeSort(0, this.values.length - 1, animationSpeed);
    this.stopAnimation();
  }

  private async mergeSort(start: number, end: number, animationSpeed: number) {
    if (start < end && this.isRunning) {
      const mid = Math.trunc((end + start) / 2);

      await this.mergeSort(start, mid, animationSpeed);
      await this.mergeSort(mid + 1, end, animationSpeed);

      await this.merge(start, mid, end, animationSpeed);
    }
  }

  private async merge(
    start: number,
    mid: number,
    end: number,
    animationSpeed: number
  ) {
    const size = end - start + 1;
    let indexStart = start;
    let indexMid = mid + 1;
    let indexAux = 0;

    const arrayAux = new Array(size);

    while (indexStart <= mid && indexMid <= end) {
      if (this.values[indexStart] < this.values[indexMid]) {
        arrayAux[indexAux] = this.values[indexStart];
        indexStart++;
      } else {
        arrayAux[indexAux] = this.values[indexMid];
        indexMid++;
      }

      indexAux++;
    }

    while (indexStart <= mid) {
      arrayAux[indexAux] = this.values[indexStart];
      indexAux++;
      indexStart++;
    }

    while (indexMid <= end) {
      arrayAux[indexAux] = this.values[indexMid];
      indexAux++;
      indexMid++;
    }

    for (indexAux = start; indexAux <= end; indexAux++) {
      this.values[indexAux] = arrayAux[indexAux - start];

      this.colors[indexAux] = "blue";
      this.paintItems();

      await this.delay(animationSpeed);

      this.colors[indexAux] = "white";
      this.paintItems();

      if (!this.isRunning) {
        this.paintBackground();
        return;
      }
    }
  }
}
