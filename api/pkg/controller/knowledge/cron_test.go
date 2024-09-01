package knowledge

import (
	"context"
	"testing"

	"github.com/helixml/helix/api/pkg/config"
	"github.com/helixml/helix/api/pkg/controller/knowledge/crawler"
	"github.com/helixml/helix/api/pkg/extract"
	"github.com/helixml/helix/api/pkg/rag"
	"github.com/helixml/helix/api/pkg/store"
	"github.com/helixml/helix/api/pkg/types"

	"github.com/stretchr/testify/suite"
	"go.uber.org/mock/gomock"
)

type CronSuite struct {
	suite.Suite

	ctx context.Context

	extractor *extract.MockExtractor
	crawler   *crawler.MockCrawler
	store     *store.MockStore
	rag       *rag.MockRAG

	cfg *config.ServerConfig

	reconciler *Reconciler
}

func TestCronSuite(t *testing.T) {
	suite.Run(t, new(CronSuite))
}

func (suite *CronSuite) SetupTest() {
	ctrl := gomock.NewController(suite.T())

	suite.ctx = context.Background()
	suite.extractor = extract.NewMockExtractor(ctrl)
	suite.crawler = crawler.NewMockCrawler(ctrl)
	suite.store = store.NewMockStore(ctrl)
	suite.rag = rag.NewMockRAG(ctrl)

	suite.cfg = &config.ServerConfig{}

	suite.reconciler, _ = New(suite.cfg, suite.store, suite.extractor, nil)

	suite.reconciler.newRagClient = func(settings *types.RAGSettings) rag.RAG {
		return suite.rag
	}

	suite.reconciler.newCrawler = func(k *types.Knowledge) (crawler.Crawler, error) {
		return suite.crawler, nil
	}
}

func (suite *CronSuite) Test_CreateJob_Daily() {
	k := &types.Knowledge{
		ID:              "knowledge_id",
		RefreshEnabled:  true,
		RefreshSchedule: "0 0 * * *",
		Source: types.KnowledgeSource{
			Web: &types.KnowledgeSourceWeb{
				URLs: []string{"https://example.com"},
			},
		},
	}

	jobs := suite.reconciler.cron.Jobs()

	err := suite.reconciler.createOrDeleteCronJobs(suite.ctx, []*types.Knowledge{k}, jobs)
	suite.Require().NoError(err)

	jobs = suite.reconciler.cron.Jobs()

	// We should have 1 job
	suite.Require().Len(jobs, 1)

	// Check name
	suite.Require().Equal(jobs[0].Name(), "knowledge_id")

	// Check tags
	suite.Require().Equal(jobs[0].Tags(), []string{"schedule:0 0 * * *"})
}
