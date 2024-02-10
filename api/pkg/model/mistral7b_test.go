package model

import (
	"testing"

	"github.com/helixml/helix/api/pkg/types"
)

func Test_formatPrompt(t *testing.T) {
	type args struct {
		session *types.Session
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "one message",
			args: args{
				session: &types.Session{
					Interactions: []*types.Interaction{
						{
							Creator: "user",
							Message: "hello",
						},
					},
				},
			},
			want: "[INST]hello[/INST]\n",
		},
		{
			name: "one message, system prompt",
			args: args{
				session: &types.Session{
					Metadata: types.SessionMetadata{
						SystemPrompt: "system prompt",
					},
					Interactions: []*types.Interaction{
						{
							Creator: "user",
							Message: "hello",
						},
					},
				},
			},
			want: "[INST]system prompt[/INST]\n[INST]hello[/INST]\n",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := formatPrompt(tt.args.session); got != tt.want {
				t.Errorf("formatPrompt() = %v, want %v", got, tt.want)
			}
		})
	}
}
