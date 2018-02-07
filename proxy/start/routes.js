"use strict"

const fetch = use("node-fetch-polyfill")

const Env = use("Env")
const Route = use("Route")
const Search = use("App/Models/Search")

// we don't need this anymore...
// Route.on("/").render("welcome")

const searchablePoint = (raw, characters = 8) => {
    const abs = Math.abs(parseFloat(raw))
    return parseFloat(abs.toString().substr(0, characters))
}

const reduceSearches = (acc, search) => {
    const { latitude, longitude } = search
    return `${acc}|${latitude},${longitude}`
}

Route.get("search", async ({ request, response }) => {
    const { latitude, longitude } = request.all()

    const searchableLatitude = searchablePoint(latitude)
    const searchableLongitude = searchablePoint(longitude)

    // console.log(searchableLatitude, searchableLongitude)

    const searches = await Search.query()
        .where("latitude", "like", `%${searchableLatitude}%`)
        .where("longitude", "like", `%${searchableLongitude}%`)
        .limit(25)
        .fetch()

    const searchRows = searches.toJSON()

    // console.log(searches.toJSON())

    const origins = searchRows.reduce(reduceSearches, "").substr(1)

    // console.log(origins)

    const key = Env.get("GOOGLE_KEY")

    const distanceResponse = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?mode=walking&units=metric&origins=${origins}&destinations=${latitude},${longitude}&key=${key}`,
    )

    const distanceData = await distanceResponse.json()

    // console.log(distanceData)

    for (let i in distanceData.rows) {
        const { elements } = distanceData.rows[i]

        if (typeof elements[0] === "undefined") {
            continue
        }

        if (elements[0].status !== "OK") {
            continue
        }

        const matches = elements[0].distance.text.match(/([0-9]+)\s+m/)

        if (matches === null || parseInt(matches[1], 10) > 10) {
            continue
        }

        response.json(JSON.parse(searchRows[i].response))
        return
    }

    const refugeResponse = await fetch(
        `https://www.refugerestrooms.org/api/v1/restrooms/by_location.json?lat=${latitude}&lng=${longitude}`,
    )

    const refugeData = await refugeResponse.json()

    await Search.create({
        latitude,
        longitude,
        response: JSON.stringify(refugeData),
    })

    response.json(refugeData)
    return
})

Route.get("condition", async ({ request, response }) => {
    const { latitude, longitude } = request.all()

    const key = Env.get("OPENWEATHER_KEY")

    const weatherResponse = await fetch(
        `http://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${key}`,
    )

    const weatherData = await weatherResponse.json()

    response.json(weatherData)
})
