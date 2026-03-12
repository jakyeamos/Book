export interface RuntimeResumeState {
  chapterId: string;
  scrollY: number;
  positionKey: string;
  updatedAt: string;
}

export interface ChapterRuntimeState {
  chapterId?: string;
  mounted: boolean;
  scrollY: number;
  transitionToken: number;
}

export class ReaderRuntime {
  private state: ChapterRuntimeState = {
    mounted: false,
    scrollY: 0,
    transitionToken: 0,
  };

  private resumeState?: RuntimeResumeState;

  getState(): ChapterRuntimeState {
    return { ...this.state };
  }

  mountChapter(chapterId: string): number {
    this.state = {
      chapterId,
      mounted: true,
      scrollY: 0,
      transitionToken: this.state.transitionToken + 1,
    };

    return this.state.transitionToken;
  }

  unmountChapter(expectedToken?: number): void {
    if (typeof expectedToken === "number" && expectedToken !== this.state.transitionToken) {
      return;
    }

    this.state = {
      mounted: false,
      chapterId: undefined,
      scrollY: 0,
      transitionToken: this.state.transitionToken + 1,
    };
  }

  updateScroll(scrollY: number): void {
    this.state = {
      ...this.state,
      scrollY: Math.max(0, scrollY),
    };
  }

  snapshotResume(positionKey: string): RuntimeResumeState {
    if (!this.state.chapterId) {
      throw new Error("Cannot snapshot resume state without active chapter");
    }

    this.resumeState = {
      chapterId: this.state.chapterId,
      scrollY: this.state.scrollY,
      positionKey,
      updatedAt: new Date().toISOString(),
    };

    return this.resumeState;
  }

  restoreResume(chapterId: string): RuntimeResumeState | undefined {
    if (!this.resumeState || this.resumeState.chapterId !== chapterId) {
      return undefined;
    }

    this.state = {
      ...this.state,
      chapterId,
      mounted: true,
      scrollY: this.resumeState.scrollY,
    };

    return this.resumeState;
  }

  async runTransition(
    chapterId: string,
    transition: (token: number) => Promise<void>,
  ): Promise<{ token: number; applied: boolean }> {
    const token = this.mountChapter(chapterId);
    await transition(token);

    if (token !== this.state.transitionToken) {
      return { token, applied: false };
    }

    return { token, applied: true };
  }
}
