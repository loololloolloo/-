import Phaser from 'phaser';
import { AudioSys } from '../systems/audio';

export const audio = new AudioSys();

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    audio.init();
    this.scene.start('menu');
  }
}