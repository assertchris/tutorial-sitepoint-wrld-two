"use strict"

const Schema = use("Schema")

class SearchSchema extends Schema {
    up() {
        this.create("searches", table => {
            table.increments()
            table.string("latitude")
            table.string("longitude")
            table.text("response")
            table.timestamps()
        })
    }

    down() {
        this.drop("searches")
    }
}

module.exports = SearchSchema
