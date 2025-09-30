{
  description = "Flake de développement pour un bot Discord en TypeScript avec Bun";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        tmux-setup = pkgs.writeShellScriptBin "tmux-setup" ''
          #!/usr/bin/env sh
          SESSION="TTY"
          DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
          if ! tmux has-session -t $SESSION 2>/dev/null; then
            tmux new-session -d -s $SESSION -c "$DIR" -n dev
            tmux send-keys -t $SESSION:0 'vim' C-m
            tmux split-window -h -p 30 -t $SESSION:0 -c "$DIR"
            tmux split-window -v -p 30 -t $SESSION:0.1 -c "$DIR"
            tmux send-keys -t $SESSION:0.2 'watch -n0.5 bunx eslint ./src' C-m
            tmux split-window -v -p 50 -t $SESSION:0.2 -c "$DIR"
            tmux send-keys -t $SESSION:0.3 'bunx prisma studio' C-m
            tmux new-window -t $SESSION:1 -n git -c "$DIR"
            tmux send-keys -t $SESSION:1 'lazygit' C-m
          fi
          tmux select-window -t $SESSION:0
          tmux select-pane -t $SESSION:0.0
          tmux attach -t $SESSION
        '';
      in {
        devShells.default = pkgs.mkShell {
          name = "discord-bot-bun-ts";
          buildInputs = with pkgs; [
            bun
            git
            curl
            wget
            nodejs_latest
            mariadb
            tmux-setup
          ];
          shellHook = ''
            export NIX_SHOW_STATS=0
            export NIX_HIDE_STATS=1
            printf "\n\033[0;90m Typescript + Bun env loaded for: \033[38;5;220m${system}\033[0m\n"
          '';
        };
      });
}
