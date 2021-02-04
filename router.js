const Router = require('koa-router');
const axios = require('axios');
const router = new Router();
const {originationName, orgUserName, Oauth, userName, personalToken} = require('./config.json');
const {clientID, clientSecret} = Oauth;
const auth = {};
router.get('/', async (ctx, next) => {
    await ctx.render('default', {
        originationName
    });
    await next();
});
router.get('/github/login', async ctx => {
    let path = `https://github.com/login/oauth/authorize?client_id=${clientID}`;
    ctx.redirect(path);
});
router.get('/oauth/redirect', async ctx => {
    const requestToken = ctx.request.query.code;
    let res = await axios.post('https://github.com/login/oauth/access_token', {
        "client_id": clientID,
        "client_secret": clientSecret,
        "code": requestToken
    }, {
        "headers": {
            "Accept": "application/json"
        }
    });
    if (res.data["error"]) {
        throw({status: 500, message: "出现了一些未知错误"});
        //{
        //   error: 'bad_verification_code',
        //   error_description: 'The code passed is incorrect or expired.',
        //   error_uri: 'https://docs.github.com/apps/managing-oauth-apps/troubleshooting-oauth-app-access-token-request-errors/#bad-verification-code'
        // }
        //{
        //   access_token: '',
        //   token_type: 'bearer',
        //   scope: ''
        // }
    } else {
        const accessToken = res.data["access_token"];
        res = await axios.get('https://api.github.com/user', {
            "headers": {
                "Authorization": `token ${accessToken}`
            }
        });
        let {login, avatar_url, name, id} = res.data;
        if (!name) name = login;
        if (!auth[login]) auth[login] = {}
        auth[login]["requestToken"] = requestToken;
        auth[login]["id"] = id;
        await ctx.render('default', {
            originationName,
            avatar_url,
            name,
            login
        });
    }
});
router.get('/join', async (ctx, next) => {
    const referer = ctx.request.header['referer'];
    const login = ctx.request.query.login;
    if (!referer || !login) {
        throw({
            status: 403,
            message: "再检查一下？"
        });
    }
    const myURL = new URL(referer);
    const code = myURL.searchParams.get('code');
    if (!code || !myURL || !auth[login] || auth[login]["requestToken"] !== code) {
        throw({
            status: 403,
            message: "再检查一下？"
        });
    }
    if (auth[login]["status"]) {
        throw({
            status: 403,
            message: "已经邀请过你啦！"
        })
    }
    const res = await axios.post(`https://api.github.com/orgs/${orgUserName}/invitations`, {
        "invitee_id": auth[login]["id"],
        "role": "direct_member"
    }, {
        headers: {
            "Accept": "application/vnd.github.v3+json",
        },
        auth: {
            username: userName,
            password: personalToken
        }
    });
    auth[login]["status"] = true;
    await next();
});
module.exports = router