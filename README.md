# Chess Framework

A headless, purely Object-Oriented Chess Engine and Framework written in TypeScript. 
This repository is managed as a monorepo using [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/).

## Packages

- **`@chess-fw/core`**: The central logic, game tree, event bus, and headless board API. [Read the Core Documentation](./packages/core/README.md).

*(More packages, such as CLI or UI adapters, can be added here in the future).*

## Getting Started

To run the project locally or contribute:

1. Install dependencies using pnpm:
```bash
pnpm install
```

2. Build all packages:
```bash
pnpm run build
```

3. Run the test suite:
```bash
pnpm run test
```

## Documentation

For detailed instructions, API references, architecture overviews, and examples of how to initialize the `ChessApp`, please refer to the specific package documentation:

👉 **[Read the `@chess-fw/core` Documentation](./packages/core/README.md)**

## Contributors

<a href="https://github.com/BradMoyetones/chess/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=BradMoyetones/chess" />
</a>

## License

MIT
