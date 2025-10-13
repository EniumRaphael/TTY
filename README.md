# TTY Discord Bot

[🇫🇷 Version française ci-dessous | French version below]

---

## English

TTY is a Discord bot developed with [Bun](https://bun.sh/), designed to provide custom features for your Discord servers.  
This project is ideal for learning, experimenting, or enhancing your Discord experience with custom commands.

### Main Features

- Custom commands (add an example here)
- Easily extensible
- Fast, thanks to Bun

### Requirements

- [Bun](https://bun.sh/) installed (v1.0 or later)
- Node.js (if required by Bun)
- A Discord bot token ([see Discord's documentation](https://discord.com/developers/applications))

### Installation

Clone the repository and install dependencies with Bun:

```bash
git clone https://github.com/EniumRaphael/TTY.git
cd TTY
bun install
```

### Configuration

Before running the bot, create a `.env` file at the root of the project and add your Discord token:

```env
DSC_TOKEN='Your discord bot token'

DATABASE_URL="url of your database"

CLIENT_ID=Your client ID
```

Add other environment variables if needed (e.g. PREFIX, etc.).

### Development Usage

To run the bot in development mode (hot reload):

```bash
bun run dev
```

### Build and Run in Production

To build the project to JavaScript:

```bash
bun run build
```

Then run the built bot:

```bash
node dist/index.js
```

### Contributing

Contributions are welcome!  
Feel free to open an issue or pull request to suggest an improvement or report a bug.

### License

MIT

---

## 🇫🇷 Français

TTY est un bot Discord développé avec [Bun](https://bun.sh/), conçu pour offrir des fonctionnalités personnalisées sur vos serveurs Discord.  
Ce projet est idéal pour apprendre, expérimenter ou enrichir votre expérience Discord avec des commandes personnalisées.

### Fonctionnalités principales

- Commandes personnalisées (ajoutez ici un exemple)
- Facilement extensible
- Rapide grâce à Bun

### Prérequis

- [Bun](https://bun.sh/) installé (version 1.0 ou supérieure)
- Node.js recommandé (si Bun le requiert)
- Un token de bot Discord ([documentation Discord pour créer un bot](https://discord.com/developers/applications))

### Installation

Clonez le dépôt, puis installez les dépendances avec Bun :

```bash
git clone https://github.com/EniumRaphael/TTY.git
cd TTY
bun install
```

### Configuration

Avant de lancer le bot, créez un fichier `.env` à la racine du projet et ajoutez votre token Discord :

```env
DSC_TOKEN='Ton discord Token'

DATABASE_URL="Ton lien de ta base de donnee"

CLIENT_ID=L'identifiant de ton client
```

Ajoutez d’autres variables d’environnement si besoin (par exemple PREFIX, etc.).

### Utilisation en développement

Pour lancer le bot en mode développement (hot reload) :

```bash
bun run dev
```

### Build et lancement en production

Pour compiler le projet en JavaScript :

```bash
bun run build
```

Puis pour lancer le bot compilé :

```bash
node dist/index.js
```

### Contribution

Les contributions sont les bienvenues !  
N’hésitez pas à ouvrir une issue ou une pull request pour proposer une amélioration ou signaler un bug.

### Licence

MIT

---
