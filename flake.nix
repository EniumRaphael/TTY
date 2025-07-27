{
	description = "Flake de développement pour un bot Discord en TypeScript avec Bun";

	inputs = {
		nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
		flake-utils.url = "github:numtide/flake-utils";
	};

	outputs = { self, nixpkgs, flake-utils }:
		flake-utils.lib.eachDefaultSystem (system:
			let
				pkgs = import nixpkgs {
					inherit system;
				};
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
					];
					shellHook = ''
						export NIX_SHOW_STATS=0
						export NIX_HIDE_STATS=1
						printf "\n\033[0;90m Typescript + Bun env loaded for: \033[38;5;220m${system}\033[0m\n"
					'';
				};
			});
}
