const express = require('express')
const axios = require('axios')

const app = express()
app.use(express.json())

// Replace with your Firebase Server Key
const firebaseServerKey =
  'AAAAojLfQBU:APA91bFx67TpLqyqUhBC6ADbaSu2rFejl-TciR_OwOwRjo0ldE2Pvix7ek3_9R7VRdCmCikt3bHa9IaCChc_FuWtpntq9dYmgOyYSDbst0mRSTKWshfRIzM53uG9cRk8obHPGymCzdNM'

const mapsAPIKey = 'AIzaSyDpTPYh7tmb_ootQRJ60y4JGIZCehtaARw'

app.post('/send-notifications', async (req, res) => {
  try {
    const location = req.body.location

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location is missing in the request.',
      })
    }

    const [latitude, longitude] = location.split('_') // Split the location into latitude and longitude

    // Get formatted address using Google Geocode API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${mapsAPIKey}`
    const geocodeResponse = await axios.get(geocodeUrl)
    const formattedAddress =
      geocodeResponse.data.results[0]?.formatted_address || 'your location'

    // Call your other API to get tokens based on the location
    const apiUrl = `http://localhost:4000/channels/mychannel/chaincodes/token/tokensBylocation?location=${location}&peer=peer0.org1.example.com&fcn=getTokensByLocation`
    const response = await axios.get(apiUrl)

    const tokens = response.data.map((tokenObj) => tokenObj.token)

    if (tokens.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'No tokens found.' })
    }

    // Send push notifications using Firebase Cloud Messaging
    const fcmPayload = {
      notification: {
        title: 'You are being exposed to high RF radiation',
        body: `A high RF radiation level is detected near ${formattedAddress}`,
      },
      data: {
        title: 'You are being exposed to high RF radiation',
        body: 'You have a new notification!',
      },
      registration_ids: tokens,
    }

    const fcmResponse = await axios.post(
      'https://fcm.googleapis.com/fcm/send',
      fcmPayload,
      {
        headers: {
          Authorization: `key=${firebaseServerKey}`,
        },
      }
    )

    if (fcmResponse.data.failure > 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notifications to some devices.',
      })
    }

    res.json({ success: true, message: 'Notifications sent successfully.' })
  } catch (error) {
    console.error('Error:', error)

    if (error.response) {
      return res
        .status(error.response.status || 500)
        .json({ success: false, message: 'Error sending notifications.' })
    }

    res
      .status(500)
      .json({ success: false, message: 'An internal server error occurred.' })
  }
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
