import { IPractice } from '../IPractice';
import { PracticeEvaluationResult, PracticeImpact } from '../../model';
import { DxPractice } from '../DxPracticeDecorator';
import { PracticeContext } from '../../contexts/practice/PracticeContext';

@DxPractice({
  id: 'LanguageIndependent.ReadmeIsPresent',
  name: 'Create a Readme File',
  impact: PracticeImpact.high,
  suggestion:
    'Add a Readme file to tell other people why is your project useful, what can they do with your project, and how can they use it.',
  reportOnlyOnce: true,
  url: 'https://dxkb.io/p/readme',
})
export class ReadmeIsPresentPractice implements IPractice {
  async isApplicable(): Promise<boolean> {
    return true;
  }

  async evaluate(ctx: PracticeContext): Promise<PracticeEvaluationResult> {
    if (!ctx.fileInspector || !ctx.root.fileInspector) {
      return PracticeEvaluationResult.unknown;
    }

    const regexReadme = new RegExp('readme', 'i');

    const files = await ctx.fileInspector.scanFor(regexReadme, '/', { shallow: true });
    const rootFiles = await ctx.root.fileInspector.scanFor(regexReadme, '/', { shallow: true });
    if (files.length > 0 || rootFiles.length > 0) {
      return PracticeEvaluationResult.practicing;
    }

    return PracticeEvaluationResult.notPracticing;
  }
}
