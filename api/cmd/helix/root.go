package helix

import (
	"context"
	"os"
	"runtime"

	"github.com/spf13/cobra"

	"github.com/helixml/helix/api/pkg/cli/app"
	"github.com/helixml/helix/api/pkg/cli/fs"
	"github.com/helixml/helix/api/pkg/cli/knowledge"
	"github.com/helixml/helix/api/pkg/cli/secret"
)

var Fatal = FatalErrorHandler

func init() { //nolint:gochecknoinits
	NewRootCmd()
}

func NewRootCmd() *cobra.Command {
	RootCmd := &cobra.Command{
		Use:   getCommandLineExecutable(),
		Short: "Helix",
		Long:  `Private GenAI Platform`,
	}

	// CLI commands (available on all platforms)
	RootCmd.AddCommand(app.New())
	RootCmd.AddCommand(app.NewApplyCmd()) // Shortcut for apply
	RootCmd.AddCommand(knowledge.New())
	RootCmd.AddCommand(fs.New())
	RootCmd.AddCommand(fs.NewUploadCmd()) // Shortcut for upload
	RootCmd.AddCommand(secret.New())

	// Commands available on all platforms
	RootCmd.AddCommand(newServeCmd())
	RootCmd.AddCommand(newVersionCommand())

	RootCmd.AddCommand(newRunCmd())
	RootCmd.AddCommand(newGptScriptCmd())
	RootCmd.AddCommand(newGptScriptRunnerCmd())
	RootCmd.AddCommand(newQapairCommand())
	RootCmd.AddCommand(newEvalsCommand())

	// Runner only works on Linux
	if runtime.GOOS == "linux" {
		RootCmd.AddCommand(newRunnerCmd())
	}

	return RootCmd
}

func Execute() {
	RootCmd := NewRootCmd()
	RootCmd.SetContext(context.Background())
	RootCmd.SetOutput(os.Stdout)
	if err := RootCmd.Execute(); err != nil {
		Fatal(RootCmd, err.Error(), 1)
	}
}
