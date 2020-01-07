import moment from 'moment';
import nock from 'nock';
import { CollaborationInspector } from '../../inspectors';
import { createTestContainer, TestContainerContext } from '../../inversify.config';
import { PracticeEvaluationResult } from '../../model';
import { BitbucketPullRequestState, BitbucketService } from '../../services';
import { BitbucketNock } from '../../test/helpers/bitbucketNock';
import { Types } from '../../types';
import { ThinPullRequestsPractice } from './ThinPullRequestsPractice';

describe('ThinPullRequestsPractice', () => {
  let practice: ThinPullRequestsPractice;
  let containerCtx: TestContainerContext;
  let bitbucketNock: BitbucketNock;
  const MockedCollaborationInspector = <jest.Mock<CollaborationInspector>>(<unknown>CollaborationInspector);
  let mockCollaborationInspector: CollaborationInspector;

  beforeEach(async () => {
    nock.cleanAll();
    bitbucketNock = new BitbucketNock('pypy', 'pypy');
  });

  beforeAll(() => {
    containerCtx = createTestContainer();
    containerCtx.container.bind('ThinPullRequestsPractice').to(ThinPullRequestsPractice);
    containerCtx.container.rebind(Types.IContentRepositoryBrowser).to(BitbucketService);
    practice = containerCtx.container.get('ThinPullRequestsPractice');
    mockCollaborationInspector = new MockedCollaborationInspector();
  });

  afterEach(async () => {
    containerCtx.virtualFileSystemService.clearFileSystem();
    containerCtx.practiceContext.fileInspector!.purgeCache();
  });

  it('return practicing if there is not a fat PR no older than 30 days than the newest PR', async () => {
    bitbucketNock.getOwnerId();
    bitbucketNock.getApiResponse({
      resource: 'pullrequests',
      state: BitbucketPullRequestState.open,
    });
    const args = {
      states: BitbucketPullRequestState.open,
      updatedAt: Date.now() - moment.duration(10, 'days').asMilliseconds(),
      withDiffStat: true,
      lines: {
        additions: 1,
        deletions: 1,
      },
    };

    mockCollaborationInspector.getPullRequests = async () => {
      return bitbucketNock.mockBitbucketPullRequestsResponse(args);
    };

    const evaluated = await practice.evaluate({
      ...containerCtx.practiceContext,
      collaborationInspector: mockCollaborationInspector,
    });
    expect(evaluated).toEqual(PracticeEvaluationResult.practicing);
  });

  it('return notPracticing if there is a fat PR no older than 30 days than the newest PR', async () => {
    bitbucketNock.getOwnerId();
    bitbucketNock.getApiResponse({
      resource: 'pullrequests',
      state: BitbucketPullRequestState.open,
    });
    const args = {
      states: BitbucketPullRequestState.open,
      updatedAt: Date.now() - moment.duration(10, 'days').asMilliseconds(),
      withDiffStat: true,
      lines: {
        additions: 1000,
        deletions: 500,
      },
    };

    mockCollaborationInspector.getPullRequests = async () => {
      return bitbucketNock.mockBitbucketPullRequestsResponse(args);
    };

    const evaluated = await practice.evaluate({
      ...containerCtx.practiceContext,
      collaborationInspector: mockCollaborationInspector,
    });
    expect(evaluated).toEqual(PracticeEvaluationResult.notPracticing);
  });

  it('return true as it is always applicable', async () => {
    const applicable = await practice.isApplicable();
    expect(applicable).toEqual(true);
  });

  it('return unknown if there is no collaborationInspector', async () => {
    containerCtx.practiceContext.collaborationInspector = undefined;

    const evaluated = await practice.evaluate(containerCtx.practiceContext);
    expect(evaluated).toEqual(PracticeEvaluationResult.unknown);
  });
});