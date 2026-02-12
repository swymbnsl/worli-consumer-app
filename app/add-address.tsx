import AddressDetailsSheet, {
  AddressDetailsSheetRef,
} from "@/components/addresses/AddressDetailsSheet"
import { COLORS } from "@/constants/theme"
import * as Location from "expo-location"
import { useRouter } from "expo-router"
import { ArrowLeft, Crosshair, MapPin, Search, X } from "lucide-react-native"
import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import MapView, { Marker, Region } from "react-native-maps"

// ─── Default Region (Mumbai) ───────────────────────────────────────────────────

const DEFAULT_REGION: Region = {
  latitude: 19.076,
  longitude: 72.8777,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GeocodedAddress {
  addressLine1: string
  addressLine2?: string
  city?: string
  state?: string
  pincode?: string
  fullAddress: string
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AddAddressScreen() {
  const router = useRouter()
  const mapRef = useRef<MapView>(null)
  const addressSheetRef = useRef<AddressDetailsSheetRef>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [region, setRegion] = useState<Region>(DEFAULT_REGION)
  const [markerCoord, setMarkerCoord] = useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  })
  const [locationName, setLocationName] = useState("")
  const [geocodedAddress, setGeocodedAddress] =
    useState<GeocodedAddress | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [reverseGeocoding, setReverseGeocoding] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<
    Location.LocationGeocodedAddress[]
  >([])
  const [searchCoords, setSearchCoords] = useState<
    { latitude: number; longitude: number }[]
  >([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // ─── Get current location on mount ──────────────────────────────────

  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = async () => {
    setLoadingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable location access in settings to use this feature.",
        )
        setLoadingLocation(false)
        return
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const newRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }

      setRegion(newRegion)
      setMarkerCoord({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      })

      mapRef.current?.animateToRegion(newRegion, 500)
      await reverseGeocode(loc.coords.latitude, loc.coords.longitude)
    } catch (err) {
      console.error("Location error:", err)
      Alert.alert(
        "Error",
        "Could not get your location. Please search manually.",
      )
    } finally {
      setLoadingLocation(false)
    }
  }

  // ─── Reverse Geocode ────────────────────────────────────────────────

  const reverseGeocode = async (lat: number, lng: number) => {
    setReverseGeocoding(true)
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      })

      if (results.length > 0) {
        const r = results[0]
        const parts = [r.name, r.street].filter(Boolean)
        const addressLine1 = parts.join(", ") || "Selected Location"
        const addressLine2 = [r.district, r.subregion]
          .filter(Boolean)
          .join(", ")
        const fullParts = [
          addressLine1,
          addressLine2,
          r.city,
          r.region,
          r.postalCode,
        ].filter(Boolean)

        setLocationName(fullParts.join(", "))
        setGeocodedAddress({
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city: r.city || undefined,
          state: r.region || undefined,
          pincode: r.postalCode || undefined,
          fullAddress: fullParts.join(", "),
        })
      } else {
        setLocationName("Unknown location")
        setGeocodedAddress(null)
      }
    } catch {
      setLocationName("Could not determine address")
      setGeocodedAddress(null)
    } finally {
      setReverseGeocoding(false)
    }
  }

  // ─── Map region change (drag pin) ───────────────────────────────────

  const handleRegionChangeComplete = useCallback(
    (newRegion: Region) => {
      if (showSearch) return // Don't update while searching
      setRegion(newRegion)
      setMarkerCoord({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      })
      reverseGeocode(newRegion.latitude, newRegion.longitude)
    },
    [showSearch],
  )

  // ─── Search for location ────────────────────────────────────────────

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length < 3) {
      setSearchResults([])
      setSearchCoords([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const coords = await Location.geocodeAsync(query)
        if (coords.length > 0) {
          // Get address details for each result
          const addresses: Location.LocationGeocodedAddress[] = []
          const coordsList: { latitude: number; longitude: number }[] = []

          for (const coord of coords.slice(0, 5)) {
            const reverse = await Location.reverseGeocodeAsync({
              latitude: coord.latitude,
              longitude: coord.longitude,
            })
            if (reverse.length > 0) {
              addresses.push(reverse[0])
              coordsList.push({
                latitude: coord.latitude,
                longitude: coord.longitude,
              })
            }
          }

          setSearchResults(addresses)
          setSearchCoords(coordsList)
        } else {
          setSearchResults([])
          setSearchCoords([])
        }
      } catch {
        setSearchResults([])
        setSearchCoords([])
      } finally {
        setSearching(false)
      }
    }, 500)
  }

  const selectSearchResult = (index: number) => {
    const coord = searchCoords[index]
    if (!coord) return

    const newRegion: Region = {
      latitude: coord.latitude,
      longitude: coord.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }

    setRegion(newRegion)
    setMarkerCoord(coord)
    mapRef.current?.animateToRegion(newRegion, 500)
    reverseGeocode(coord.latitude, coord.longitude)

    setShowSearch(false)
    setSearchQuery("")
    setSearchResults([])
    setSearchCoords([])
    Keyboard.dismiss()
  }

  // ─── Open address details ───────────────────────────────────────────

  const handleAddDetails = () => {
    addressSheetRef.current?.open({
      latitude: markerCoord.latitude,
      longitude: markerCoord.longitude,
      addressLine1: geocodedAddress?.addressLine1 || "",
      addressLine2: geocodedAddress?.addressLine2,
      city: geocodedAddress?.city,
      state: geocodedAddress?.state,
      pincode: geocodedAddress?.pincode,
    })
  }

  const handleSaved = () => {
    Alert.alert("Success", "Address saved successfully!", [
      { text: "OK", onPress: () => router.back() },
    ])
  }

  // ─── Format search result for display ───────────────────────────────

  const formatSearchResult = (addr: Location.LocationGeocodedAddress) => {
    const primary = [addr.name, addr.street].filter(Boolean).join(", ")
    const secondary = [addr.city, addr.region, addr.postalCode]
      .filter(Boolean)
      .join(", ")
    return { primary: primary || "Unknown", secondary }
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-white">
      {/* Map */}
      <View className="flex-1">
        <MapView
          ref={mapRef}
          className="flex-1"
          initialRegion={DEFAULT_REGION}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          mapPadding={{ top: 100, right: 0, bottom: 0, left: 0 }}
        >
          <Marker
            coordinate={markerCoord}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate
              setMarkerCoord({ latitude, longitude })
              reverseGeocode(latitude, longitude)
            }}
          >
            <View className="items-center">
              <View className="bg-primary-navy p-2 rounded-full">
                <MapPin size={22} color={COLORS.neutral.white} />
              </View>
              <View className="w-3 h-3 bg-primary-navy rounded-full mt-[-2px]" />
            </View>
          </Marker>
        </MapView>

        {/* Back Button */}
        <TouchableOpacity
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white items-center justify-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          }}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={COLORS.primary.navy} />
        </TouchableOpacity>

        {/* Search Bar */}
        <View
          className="absolute top-4 left-16 right-16"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center bg-white rounded-xl px-3 py-2">
            <Search size={18} color={COLORS.neutral.gray} />
            <TextInput
              className="flex-1 ml-2 font-comfortaa text-sm text-primary-navy"
              placeholder="Search for a location"
              placeholderTextColor={COLORS.neutral.gray}
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setShowSearch(true)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("")
                  setSearchResults([])
                  setSearchCoords([])
                  setShowSearch(false)
                  Keyboard.dismiss()
                }}
              >
                <X size={18} color={COLORS.neutral.gray} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Dropdown */}
          {showSearch && (searchResults.length > 0 || searching) && (
            <View className="bg-white rounded-xl mt-1 max-h-60 overflow-hidden">
              {searching ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color={COLORS.primary.navy} />
                </View>
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(_, i) => i.toString()}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item, index }) => {
                    const { primary, secondary } = formatSearchResult(item)
                    return (
                      <TouchableOpacity
                        className="flex-row items-start px-3 py-3 border-b border-neutral-lightGray"
                        onPress={() => selectSearchResult(index)}
                      >
                        <MapPin
                          size={16}
                          color={COLORS.neutral.gray}
                          style={{ marginTop: 2 }}
                        />
                        <View className="flex-1 ml-2">
                          <Text
                            className="font-sofia-bold text-sm text-primary-navy"
                            numberOfLines={1}
                          >
                            {primary}
                          </Text>
                          {secondary ? (
                            <Text
                              className="font-comfortaa text-xs text-neutral-gray mt-0.5"
                              numberOfLines={1}
                            >
                              {secondary}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    )
                  }}
                />
              )}
            </View>
          )}
        </View>

        {/* Current Location Button */}
        <TouchableOpacity
          className="absolute right-4 bg-white w-11 h-11 rounded-full items-center justify-center"
          style={{
            bottom: Platform.OS === "ios" ? 250 : 230,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          }}
          onPress={getCurrentLocation}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={COLORS.primary.navy} />
          ) : (
            <Crosshair size={20} color={COLORS.primary.navy} />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Location Card */}
      <View
        className="bg-white px-5 pt-5 pb-6"
        style={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
          marginTop: -20,
        }}
      >
        {/* Location Info */}
        <View className="flex-row items-start mb-5">
          <View className="bg-primary-cream p-2 rounded-full mr-3 mt-0.5">
            <MapPin size={18} color={COLORS.primary.navy} />
          </View>
          <View className="flex-1">
            <Text className="font-sofia-bold text-base text-primary-navy mb-1">
              {reverseGeocoding ? "Finding address..." : "Selected Location"}
            </Text>
            {reverseGeocoding ? (
              <ActivityIndicator
                size="small"
                color={COLORS.neutral.gray}
                style={{ alignSelf: "flex-start" }}
              />
            ) : (
              <Text
                className="font-comfortaa text-sm text-neutral-darkGray leading-5"
                numberOfLines={2}
              >
                {locationName || "Move the pin to select a location"}
              </Text>
            )}
          </View>
        </View>

        {/* Add Address Details Button */}
        <TouchableOpacity
          className="bg-primary-navy py-4 rounded-2xl items-center active:opacity-90"
          onPress={handleAddDetails}
          disabled={reverseGeocoding || loadingLocation}
        >
          <Text className="font-sofia-bold text-base text-white">
            Add More Address Details
          </Text>
        </TouchableOpacity>
      </View>

      {/* Address Details Bottom Sheet */}
      <AddressDetailsSheet ref={addressSheetRef} onSaved={handleSaved} />
    </View>
  )
}
