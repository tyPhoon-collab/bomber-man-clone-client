import './app.css';
import { Engine } from './engine';
import { Title } from './title/title';

export const engine = new Engine();
engine.push(new Title());

export function getTargetDocument() {
  return document.getElementById('app')!;
}
