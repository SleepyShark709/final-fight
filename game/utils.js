const log = console.log.bind(console)

const imageFromPath = (path) => {
    let img = new Image()
    img.src = path
    return img
}
const reactIntersects = (a, b) => {
    if (b.y > a.y && b.y < a.y + a.h && b.x > a.x && b.x < a.x + a.w) {
        return true
    } else {
        return false
    }
}

function impact(obj, dobj) {
    var o = {
        x: obj.x,
        y: obj.y,
        w: obj.w,
        h: obj.h
    }

    var d = {
        x: dobj.x,
        y: dobj.y,
        w: dobj.w,
        h: dobj.h
    }

    var px, py;

    px = o.x <= d.x ? d.x : o.x;
    py = o.y <= d.y ? d.y : o.y;

    // 判断点是否都在两个对象中
    if (px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h && px >= d.x && px <= d.x + d.w && py >= d.y && py <= d.y + d.h) {
        return true;
    } else {
        return false;
    }
}


const randomBetween = (start, end) => {
    let n = Math.random() * (end - start + 1)
    return Math.floor(n + start)
}
// const config = {
//     player_speed: 10,
//     cloud_speed: 1,
//     enemy_speed: 5,
//     bullet_speed: 5,
//     fire_cooldown: 9,
// }