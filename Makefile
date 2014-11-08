test:
	@NODE_ENV=test ./node_modules/.bin/mocha

test-coveralls:
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@$(MAKE) test REPORTER=mocha-lcov-reporter | ./node_modules/.bin/coveralls

.PHONY: test