module.exports = {
	apps: [],

	deploy: {
		production: {
			key: "~/.ssh/redditors-expansion.pem",
			user: "ec2-user",
			host: "image.redditvideomaker.com",
			ref: "origin/master",
			repo: "git@github.com:FOLLGAD/4chan-reader.git",
			path: "/home/ec2-user/4chan",
			"pre-deploy-local": "",
			"post-deploy":
				"npm install && npm run build && cd ../.. && pm2 reload ecosystem.config.js --env production",
			"pre-setup": "",
		},
	},
}
