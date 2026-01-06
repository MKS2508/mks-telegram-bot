# CLI Tools

## Usage

```bash
bun run cli           # Show all commands
bun run cli ngrok     # Run ngrok command
bun run ngrok         # Shortcut for ngrok command
```

## Adding New Commands

1. Create file in `tools/commands/mycommand.ts`
2. Export default object with `BotCommand` interface
3. Implement `register(program)` method

Example:

```typescript
import { Command } from 'commander'
import type { BotCommand } from './index.js'

interface MyCommand extends BotCommand {
  name: 'mycommand'
  description: string
  register: (program: Command) => void
}

const command: MyCommand = {
  name: 'mycommand',
  description: 'My command description',

  register(program: Command) {
    program
      .command('mycommand')
      .description('Does something')
      .option('-o, --option <value>', 'Option description', 'default')
      .action(async (options) => {
        // Implementation
      })
  },
}

export default command
```

Commands are auto-discovered and registered on CLI startup.
