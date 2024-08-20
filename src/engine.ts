import * as THREE from 'three';

export interface EngineContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  activate: () => void;
  deactivate: () => void;

  update: (delta: number) => void;
}

export class Engine {
  renderer: THREE.WebGLRenderer;
  private contexts: EngineContext[] = [];
  private clock: THREE.Clock;
  private _frameCount = 0;

  constructor() {
    const renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    this.renderer = renderer;
    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.resize.bind(this));
    renderer.setAnimationLoop(this.update.bind(this));
  }

  get current(): EngineContext | null {
    return this.contexts[this.contexts.length - 1] || null;
  }

  get frameCount(): number {
    return this._frameCount;
  }

  push(context: EngineContext) {
    this.current?.deactivate();
    context.activate();
    this.resize();
    this.contexts.push(context);

    return this;
  }

  pop() {
    if (this.contexts.length <= 1) {
      return this;
    }

    this.current!.deactivate();
    this.contexts.pop()!;
    this.current!.activate();

    return this;
  }

  update() {
    this.render();

    const delta = this.clock.getDelta();
    this.current?.update(delta);
  }

  private render() {
    this._frameCount++;
    if (this.current == null) {
      return;
    }
    this.renderer.render(this.current.scene, this.current.camera);
  }

  resize() {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.current == null) {
      return;
    }
    this.current.camera.aspect = window.innerWidth / window.innerHeight;
    this.current.camera.updateProjectionMatrix();
  }
}
