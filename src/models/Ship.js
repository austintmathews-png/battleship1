export default class Ship {
  constructor(length) {
    if (!Number.isInteger(length) || length <= 0) {
      throw new Error("Ship length must be a positive integer");
    }

    this.length = length;
    this.hits = 0;
  }

  hit() {
    if (this.hits < this.length) this.hits += 1;
  }

  get sunk() {
    return this.hits >= this.length;
  }
}
