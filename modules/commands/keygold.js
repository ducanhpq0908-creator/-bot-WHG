const silverCmd = require("./keysilver.js");
module.exports = {
    name: "keygold",
    description: "Phong Trưởng nhóm",
    role: "admin",
    execute: silverCmd.execute
};