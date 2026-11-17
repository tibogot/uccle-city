
## 1. Full lock, speed held: radius / lateral g / body slip
| km/h | OLD | NEW |
|---|---|---|
| 5 | 3.9 m / 0.04 g / 0.0° | 4.1 m / 0.06 g / 0.0° |
| 15 | 4.0 m / 0.53 g / 17.0° | 4.2 m / 0.47 g / 1.8° |
| 30 | 7.6 m / 0.98 g / 5.6° | 8.1 m / 0.92 g / 2.2° |
| 50 | 21.1 m / 0.96 g / 0.3° | 22.0 m / 0.92 g / 1.3° |
| 80 | 57.9 m / 0.88 g / 1.9° | 55.7 m / 0.92 g / 0.8° |
| 110 | 114.7 m / 0.82 g / 2.2° | 102.3 m / 0.92 g / 0.6° |

## 1b. Steady yaw rate vs stick at 50 km/h (gamepad)
| stick | OLD | NEW |
|---|---|---|
| 0.25 | 10.3 °/s | 9.1 °/s |
| 0.5 | 20.6 °/s | 18.3 °/s |
| 0.75 | 30.4 °/s | 27.4 °/s |
| 1 | 38.1 °/s | 36.6 °/s |

## 2. Steer key held: time to 63 / 90 % of the steady yaw rate, overshoot; released: back to straight
| km/h | OLD | NEW |
|---|---|---|
| 30 | 0.25 / 0.53 s, over 1 %, release 0.17 s (0.0°/s back) | 0.12 / 0.20 s, over 0 %, release 0.23 s (0.0°/s back) |
| 50 | 0.12 / 0.23 s, over 2 %, release 0.20 s (0.0°/s back) | 0.13 / 0.22 s, over 0 %, release 0.23 s (0.0°/s back) |
| 90 | 0.08 / 0.18 s, over 5 %, release 0.30 s (0.1°/s back) | 0.18 / 0.27 s, over 0 %, release 0.23 s (0.0°/s back) |

## 2b. Lane change 3.5 m: a smooth pad driver (1 m reached, settled ±0.15 m / ±1.1°, overshoot); two equal keyboard taps (offset, heading left over)
| km/h | OLD | NEW |
|---|---|---|
| 50 | pad: 1 m at 0.87 s, in lane 2.75 s, over 3 cm | keys 2 x 0.3 s: 2.06 m, 2.5° left over | pad: 1 m at 0.93 s, in lane 2.70 s, over 9 cm | keys 2 x 0.3 s: 1.54 m, 1.5° left over |
| 90 | pad: 1 m at 0.83 s, in lane 4.42 s, over 68 cm | keys 2 x 0.3 s: 0.90 m, 0.1° left over | pad: 1 m at 0.82 s, in lane 4.28 s, over 65 cm | keys 2 x 0.3 s: 1.24 m, 0.6° left over |

## 3. 90° junction at 30 km/h: full lock until 75°, then let go
|  | lock held | min radius | final turn | max slip | corner (fwd / side) |
|---|---|---|---|---|---|
| old | 1.42 s | 7.6 m | 81.6° | 5.9° | 13.2 / 37.1 m |
| new | 1.37 s | 8.1 m | 82.1° | 2.2° | 13.4 / 36.5 m |

## 4. Slalom at 50 km/h (keyboard, ±1 every 0.65 s): weave width, max slip, speed lost, straight again after
|  | weave | max slip | speed lost | settled |
|---|---|---|---|---|
| old | 1.67 m | 1.9° | -0.7 km/h | 0.22 s |
| new | 2.25 m | 1.3° | -0.7 km/h | 0.27 s |

## 5. Hill start on 15 %: roll-back, time to 30 km/h
|  | roll-back | 0-30 km/h |
|---|---|---|
| old | 0.0 cm | 1.73 s |
| new | 0.0 cm | 1.85 s |

## 6. Kerb 15 cm: over?, airtime, body speeds, heading change
| case | OLD | NEW |
|---|---|---|
| 10 km/h 0° | over, air 0.00 s, vy 0.29 m/s, pitch 0.22 / roll 0.00 rad/s, heading 0.0° | over, air 0.00 s, vy 0.25 m/s, pitch 0.19 / roll 0.00 rad/s, heading 0.0° |
| 10 km/h 30° | over, air 0.00 s, vy 0.19 m/s, pitch 0.14 / roll 0.19 rad/s, heading 0.0° | over, air 0.00 s, vy 0.20 m/s, pitch 0.15 / roll 0.15 rad/s, heading 0.0° |
| 20 km/h 0° | over, air 0.00 s, vy 0.51 m/s, pitch 0.42 / roll 0.00 rad/s, heading 0.0° | over, air 0.00 s, vy 0.49 m/s, pitch 0.38 / roll 0.00 rad/s, heading 0.0° |
| 20 km/h 30° | over, air 0.00 s, vy 0.32 m/s, pitch 0.28 / roll 0.29 rad/s, heading 0.0° | over, air 0.00 s, vy 0.33 m/s, pitch 0.27 / roll 0.29 rad/s, heading 0.0° |
| 50 km/h 0° | over, air 0.00 s, vy 0.76 m/s, pitch 0.57 / roll 0.00 rad/s, heading 0.0° | over, air 0.00 s, vy 0.95 m/s, pitch 0.80 / roll 0.00 rad/s, heading 0.0° |
| 50 km/h 30° | over, air 0.00 s, vy 0.57 m/s, pitch 0.45 / roll 0.35 rad/s, heading 0.0° | over, air 0.00 s, vy 0.70 m/s, pitch 0.65 / roll 0.53 rad/s, heading 0.0° |

## 7. Braking (S held) to a stop
| from km/h | OLD | NEW |
|---|---|---|
| 50 | 8.5 m (1.23 s) | 9.9 m (1.37 s) |
| 100 | 33.1 m (2.43 s) | 36.9 m (2.62 s) |

## 7b. Handbrake + full lock 0.7 s at 45 km/h, then throttle straight
|  | turned | max slide | straight after | speed 4 s on |
|---|---|---|---|---|
| old | 53° | 30° | 1.50 s | 82 km/h |
| new | 54° | 52° | 0.43 s | 85 km/h |

## 8a. Camera, route "bumpy": high-frequency (> ~2.5 Hz) RMS of the camera's position relative to the car and of the view direction
|  | pos HF | height HF | view yaw HF | view pitch HF | max lean | fov range | car bearing sd |
|---|---|---|---|---|---|---|---|
| old | 3.4 mm | 2.9 mm | 0.006° | 0.012° | 0.00° | 0.7° | 0.00° |
| new | 1.3 mm | 1.3 mm | 0.000° | 0.008° | 0.00° | 0.1° | 0.00° |

## 8b. Camera, route "turns": high-frequency (> ~2.5 Hz) RMS of the camera's position relative to the car and of the view direction
|  | pos HF | height HF | view yaw HF | view pitch HF | max lean | fov range | car bearing sd |
|---|---|---|---|---|---|---|---|
| old | 54.2 mm | 0.0 mm | 0.845° | 0.005° | 1.35° | 3.0° | 3.85° |
| new | 39.8 mm | 0.0 mm | 0.377° | 0.000° | 0.00° | 0.5° | 0.00° |

## 8c. Camera height over the car: flat, steady 12 % climb at 40 km/h, over the crest
|  | flat | climbing | crest range |
|---|---|---|---|
| old | 2.00 m | 1.86 m | 1.86 .. 2.02 m |
| new | 1.90 m | 1.39 m | 1.40 .. 2.09 m |

  camera HF energy (pos², new / old): bumpy 14 %, turns 54 %

## 10. Trams / trains solid (fake tram in the tramline.js bodies() format)
| case | result |  |
|---|---|---|
| 40+ km/h into its side | stopped 2.15 m from its centre-side (car half 2.15) | speed then 0.0 km/h |
| tram at 29 km/h into a stopped car | pushed to 31.0, 30.0 | car speed max 0.0 km/h |
| 30 km/h, 15° scrape along its side | slid on, x 0.5 | speed 40.4 km/h |
| rail bridge 6 m over the road | passes under |  |
| walker capsule inside the tram | pushed (0.00, 1.00) 1.00 m |  |
| cost: car step next to a tram | 3.4 µs / frame |  |

## 9. Cost per 60 Hz frame (2 substeps, node, synthetic ground)
|  | step |
|---|---|
| old | 2.9 µs |
| new | 1.4 µs |

all NEW checks pass
