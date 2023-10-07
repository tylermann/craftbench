# CraftBench

CraftBench is a VSCode extension that includes tools for augmenting your development using AI.

## Features

CraftBench offers several different commands that all utilize OpenAI to propose changes to your code. The changes are all only applied after chosing to accept them.

### `Convert to TypeScript`

This command will attempt to convert a .js or .jsx file to a .ts or .tsx file using AI. The file will be automatically renamed to the new extension if the changes are accepted.

### `Craft`

This command looks for any comments that begin with "craft:" in your current file as instructions for the AI to follow. The AI will attempt to make the suggested changes to your code, remove those craft comments, and propose the edits as changes to be accepted.

### `Harden`

This command is just an experimental example of a simple command that can be created on top of the "propose" functionality in this extension. It attempts to have the AI improve the code in the current file by making it more robust.

### `Polish`

Similar to above, this is an experimental example of a simple command on top of the "propose" functionality that attempts to have the AI improve the code in the current file by making it more readable.

## OpenAI API Key

This extension requires an OpenAI API key to be set before it can be used. You will be prompted to enter your API key when you first try to use a command from the extension. Your key is stored in the VSCode provided SecretStorage.

## Extension Settings

This extension contributes the following settings:

* `craftbench.useLargeModel`: Defines whether to use gpt-4 or gpt-3.5 as the default AI model. Defaults to use gpt-3.5 as it is faster and cheaper, but provides less accurate results.
* `craftbench.allowLargerRetry`: Defaults to false. If set to true and you are using gpt-3.5, then it will give you a button/option to retry the same command with gpt-4 before accepting the changes.
