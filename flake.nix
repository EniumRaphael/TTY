{
  description = "TTY flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      rust-overlay,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [ (import rust-overlay) ];
        tmux-setup = pkgs.writeShellScriptBin "tmux-setup" ''
          #!/usr/bin/env sh
          SESSION="TTY"
          DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
          if ! tmux has-session -t $SESSION 2>/dev/null; then
            tmux new-session -d -s $SESSION -c "$DIR" -n dev
            tmux send-keys -t $SESSION:0 'vim' C-m
            tmux split-window -h -p 30 -t $SESSION:0 -c "$DIR"
            tmux send-keys -t $SESSION:0.1 'exec zsh' C-m
            tmux new-window -t $SESSION:1 -n git -c "$DIR"
            tmux send-keys -t $SESSION:1 'lazygit' C-m
          fi
          tmux select-window -t $SESSION:0
          tmux select-pane -t $SESSION:0.0
          tmux attach -t $SESSION
        '';
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [
            "rust-src"
            "rust-analyzer"
            "clippy"
            "rustfmt"
          ];
        };
      in
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            pkg-config
          ];

          buildInputs =
            with pkgs;
            [
              tmux-setup
              rustToolchain
              cargo-watch
              cargo-edit
              cargo-audit
              openssl
            ]
            ++ lib.optionals stdenv.isDarwin [
              libiconv
            ];

          shellHook = ''
            export RUST_BACKTRACE=1;
            export RUST_LOG="debug";
            printf "\n\033[0;90mRust env loaded for: \033[38;5;220m${system}\033[0;90m [rustc: $(rustc --version | awk '{print $2}') | cargo: $(cargo --version | awk '{print $2}')]\033[0m\n"
          '';
        };
      }
    );
}
