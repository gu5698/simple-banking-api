npx rimraf dist

export NODE_ENV=production

npx tsc -p ./tsconfig.build.json --pretty

cp -R src/public dist/src/public

cp package.json dist/

cp env.example dist/.env
