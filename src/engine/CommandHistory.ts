import type { CountryObject, Vec2 } from '../types';

export interface Command {
  id: string;
  name: string;
  execute: () => void;
  undo: () => void;
}

const MAX_HISTORY = 50;

export class CommandHistory {
  private past: Command[] = [];
  private future: Command[] = [];
  private onChange?: () => void;

  setOnChange(fn: () => void) { this.onChange = fn; }

  push(cmd: Command) {
    cmd.execute();
    this.past.push(cmd);
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.future = [];
    this.onChange?.();
  }

  undo() {
    const cmd = this.past.pop();
    if (!cmd) return;
    cmd.undo();
    this.future.push(cmd);
    this.onChange?.();
  }

  redo() {
    const cmd = this.future.pop();
    if (!cmd) return;
    cmd.execute();
    this.past.push(cmd);
    this.onChange?.();
  }

  canUndo() { return this.past.length > 0; }
  canRedo() { return this.future.length > 0; }

  clear() { this.past = []; this.future = []; this.onChange?.(); }

  getUndoName() { return this.past[this.past.length - 1]?.name ?? null; }
  getRedoName() { return this.future[this.future.length - 1]?.name ?? null; }
}

let _cmdId = 0;
const nextId = () => `cmd_${++_cmdId}`;

export const makeMoveCommand = (
  country: CountryObject,
  fromPos: Vec2,
  toPos: Vec2,
  update: (id: string, pos: Vec2) => void
): Command => ({
  id: nextId(),
  name: `Move ${country.name}`,
  execute: () => update(country.id, toPos),
  undo: () => update(country.id, fromPos),
});

export const makeRotateCommand = (
  country: CountryObject,
  fromRot: number,
  toRot: number,
  update: (id: string, rot: number) => void
): Command => ({
  id: nextId(),
  name: `Rotate ${country.name}`,
  execute: () => update(country.id, toRot),
  undo: () => update(country.id, fromRot),
});

export const makeScaleCommand = (
  country: CountryObject,
  fromScale: number,
  toScale: number,
  update: (id: string, scale: number) => void
): Command => ({
  id: nextId(),
  name: `Scale ${country.name}`,
  execute: () => update(country.id, toScale),
  undo: () => update(country.id, fromScale),
});

export const makeDeleteCommand = (
  country: CountryObject,
  doDelete: (id: string) => void,
  doRestore: (c: CountryObject) => void
): Command => ({
  id: nextId(),
  name: `Delete ${country.name}`,
  execute: () => doDelete(country.id),
  undo: () => doRestore(country),
});

export const makeBatchCommand = (
  name: string,
  commands: Command[]
): Command => ({
  id: nextId(),
  name,
  execute: () => commands.forEach(c => c.execute()),
  undo: () => [...commands].reverse().forEach(c => c.undo()),
});
