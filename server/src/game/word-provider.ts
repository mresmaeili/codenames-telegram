export interface WordProvider {
  getWords(count: number): Promise<string[]>;
}

export class StaticWordProvider implements WordProvider {
  private readonly words: string[];

  constructor(words: string[] = []) {
    this.words = [...words];
  }

  async getWords(count: number): Promise<string[]> {
    if (count <= 0) {
      return [];
    }

    const availableWords = [...this.words];
    if (availableWords.length < count) {
      throw new Error(
        "Not enough words available for the requested game board.",
      );
    }

    const selectedWords: string[] = [];
    while (selectedWords.length < count) {
      const randomIndex = Math.floor(Math.random() * availableWords.length);
      const [word] = availableWords.splice(randomIndex, 1);
      selectedWords.push(word);
    }

    return selectedWords;
  }
}
