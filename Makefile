.PHONY: dev deploy

dev:
	npx vercel dev

deploy:
	npx vercel --prod
