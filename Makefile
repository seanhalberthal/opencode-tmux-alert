.PHONY: build test check clean fmt lint

## Build TypeScript source
build:
	bun run build

## Run tests
test:
	bun test

## Run all quality checks (test + build)
check: test build

## Remove build artefacts
clean:
	rm -rf dist

## Format source files
fmt:
	bunx prettier --write 'src/**/*.ts'

## Lint source files
lint:
	bunx prettier --check 'src/**/*.ts'
