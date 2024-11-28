.PHONY: ruler
ruler:
	npx cursorruler -i "*.js" -i "*.json" -i "*.ts" -i "*.tsx" -r -w

.PHONY: test
test:
	pnpm test
