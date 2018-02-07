const Wrld = require("wrld.js")
const env = require("./env")

const keys = {
    wrld: env.WRLD_KEY,
}

let map
let highlightedFacilities = []
let highlighterMarkers = []

const highlightFacilities = async (latitude, longitude) => {
    for (let facility of highlightedFacilities) {
        facility.remove()
    }

    highlightedFacilities = []

    for (let marker of highlighterMarkers) {
        marker.remove()
    }

    highlighterMarkers = []

    const facilitiesResponse = await fetch(
        `http://127.0.0.1:3333/search?latitude=${latitude}&longitude=${longitude}`,
    )

    const facilitiesData = await facilitiesResponse.json()

    for (let facility of facilitiesData) {
        const location = [facility.latitude, facility.longitude]

        const color =
            facility.upvote >= facility.downvote
                ? [125, 255, 125, 200]
                : [255, 125, 125, 200]

        const highlight = Wrld.buildings
            .buildingHighlight(
                Wrld.buildings
                    .buildingHighlightOptions()
                    .highlightBuildingAtLocation(location)
                    .color(color),
            )
            .addTo(map)

        highlightedFacilities.push(highlight)

        const intersection = map.buildings.findBuildingAtLatLng(location)

        let marker

        if (intersection.found) {
            marker = L.marker(location, {
                elevation: intersection.point.alt,
                title: facility.name,
            }).addTo(map)
        } else {
            marker = L.marker(location, {
                title: facility.name,
            }).addTo(map)
        }

        if (facility.comment) {
            marker.bindPopup(facility.comment).openPopup()
        }

        highlighterMarkers.push(marker)
    }

    try {
        const weatherResponse = await fetch(
            `http://127.0.0.1:3333/condition? ↵
                latitude=${latitude}&longitude=${longitude}`,
        )

        const weatherData = await weatherResponse.json()

        if (weatherData.weather && weatherData.weather.length > 0) {
            const condition = weatherData.weather[0].main.toLowerCase()

            switch (condition) {
                case "snow":
                    map.themes.setWeather(Wrld.themes.weather.Snowy)
                    break
                case "few clouds":
                case "scattered clouds":
                case "broken clouds":
                    map.themes.setWeather(Wrld.themes.weather.Overcast)
                    break
                case "mist":
                    map.themes.setWeather(Wrld.themes.weather.Foggy)
                    break
                case "shower rain":
                case "rain":
                case "thunderstorm":
                    map.themes.setWeather(Wrld.themes.weather.Rainy)
                    break
                default:
                    map.themes.setWeather(Wrld.themes.weather.Clear)
                    break
            }
        }

        const time = new Date().getHours()

        if (time > 5 && time <= 10) {
            map.themes.setTime(Wrld.themes.time.Dawn)
        } else if (time > 10 && time <= 16) {
            map.themes.setTime(Wrld.themes.time.Day)
        } else if (time > 16 && time < 21) {
            map.themes.setTime(Wrld.themes.time.Dusk)
        } else {
            map.themes.setTime(Wrld.themes.time.Night)
        }
    } catch (e) {
        // weather and time effects are entirely optional
        // if they break, for whatever reason, they shouldn't kill the app
    }
}

const latitudeInput = document.querySelector("[name='latitude']")
const longitudeInput = document.querySelector("[name='longitude']")
const applyButton = document.querySelector("[name='apply']")

const initMapEvents = async (latitude, longitude) => {
    map.on("initialstreamingcomplete", () => {
        highlightFacilities(latitude, longitude)
    })

    map.on("panend", event => {
        const { lat, lng } = map.getBounds().getCenter()

        latitudeInput.value = lat
        longitudeInput.value = lng
    })

    applyButton.addEventListener("click", () => {
        map.setView([latitudeInput.value, longitudeInput.value])
        highlightFacilities(latitudeInput.value, longitudeInput.value)
    })
}

window.addEventListener("load", async () => {
    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords

            latitudeInput.value = latitude
            longitudeInput.value = longitude

            map = Wrld.map("map", keys.wrld, {
                center: [latitude, longitude],
                zoom: 15,
            })

            initMapEvents(latitude, longitude)
        },
        error => {
            const latitude = 40.7484405
            const longitude = -73.98566439999999

            map = Wrld.map("map", keys.wrld, {
                center: [latitude, longitude],
                zoom: 15,
            })

            initMapEvents(latitude, longitude)
        },
    )
})
