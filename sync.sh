rsync -rvu ./build/ ubuntu@54.37.148.199:/home/ubuntu/Websites/nodeBots/proxy/ --delete --exclude "node_modules" --exclude ".cookies/*" --exclude .env --exclude package.json --exclude package-lock.json &&\
rsync -vu ./.env  ubuntu@54.37.148.199:/home/ubuntu/Websites/nodeBots/proxy/ &&\
rsync -vu ./package*  ubuntu@54.37.148.199:/home/ubuntu/Websites/nodeBots/proxy/ &&\
rsync -rvu ./node_modules/ ubuntu@54.37.148.199:/home/ubuntu/Websites/nodeBots/proxy/node_modules/ --delete
