const MY_WORKCHAIN = BASECHAIN
const OP_WITHOUT_DUMP = stringCrc32("without_dump") // e3c4f498
const OP_WITH_DUMP = stringCrc32("with_dump") // 9d848e0e

const OP_SUM = stringCrc32("sum") // c8bd9f4d
const OP_MUL = stringCrc32("mul") // a90221a1

@inline
fun sum(a: int, b: int): int {
    assert(a + b < 24) throw 1000;
    return a + b;
}

@inline
fun mul(a: int, b: int): int {
    assert(a * b < 24) throw 1001;
    return a * b;
}

@inline
fun routeInternal(`ctx::sender`: slice, `ctx::value`: int, `ctx::fwd_fee`: int, `ctx::body`: slice) {
    // Load op and query id
    var (op: int, queryId: int) = `ctx::body`.loadOpAndQueryId();

    /*
        When executing op::without_dump, the result returned by sum() is not used. Even though I marked sum() as impure, 
        the contract still does not throw an error.

        -> The impure functionality is not being triggered.
    */
    if (op == OP_WITHOUT_DUMP) {
        var func =  queryId % 2 == 0 ? sum : mul;
        var result: int = func(100, 200);
        // ~dump(result);
        return;
    }

    /* 
        When executing op::with_dump, the result returned by mul() is used -> Contract throws error
    */
    if (op == OP_WITH_DUMP) {
        var func = queryId % 2 == 0 ? sum : mul;
        var result: int = func(100, 200);
        ~debug.print(result);
        return;
    }

    /*
        When executing op::sum, the result returned by sum() is not used, but sum() is called directly -> Contract does throw error
    */
    if (op == OP_SUM) {
        var result: int = sum(100, 200);
        return;
    }

    /*
        When executing op::mul, the result returned by mul() is used -> Contract throws error
    */
    if (op == OP_MUL) {
        var result: int = mul(100, 200);
        ~debug.print(result);
        return;
    }

    throw 0xffff;
}

fun main(`ctx::value`: int, inMsgFull: cell, `ctx::body`: slice) {
    var s: slice = inMsgFull.beginParse();
    var flags: int = s.loadMsgFlags();

    if (isBounced(flags)) { // skip all bounced messages
        return;
    }

    // get context
    var (`ctx::sender`: slice, `ctx::fwd_fee`: int) = s.retrieveCtx(MY_WORKCHAIN);

    // route function to handle internal message
    routeInternal(`ctx::sender`, `ctx::value`, `ctx::fwd_fee`, `ctx::body`);
}
