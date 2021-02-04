const Koa = require('koa');
const views = require('koa-views');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const mount = require('koa-mount');
const path = require('path');
const router = require('./router');
const Resolve = p => path.resolve(__dirname, p);
const app = new Koa();
const debug = () => {
    return async (ctx, next) => {
        try {
            await next();
        } catch (e) {
            if (e.response) {
                ctx.body = {
                    status: e.response.status,
                    message: e.response.data
                }
            } else if (e.request) {
                ctx.body = {
                    status: 500,
                    message: "请求GitHub API发生错误"
                }
            } else {
                ctx.body = e;
            }
        }
    }
}
app.use(debug());
app.use(bodyParser());
app.use(mount('/static', serve(Resolve('./static'))));
app.use(views((Resolve('./views')), {
    extension: 'ejs'
}));
app.use(router.routes());
app.listen(3000, () => {
    console.log("http://localhost:3000");
})