[out:json][timeout:240];
area["boundary"="administrative"]["admin_level"="8"]["name"="Rio de Janeiro"]->.rio;
(
  node(area.rio)["amenity"~"^(school|hospital|clinic|university|college|kindergarten|library|community_centre|social_facility)$"];
  way(area.rio)["amenity"~"^(school|hospital|clinic|university|college|kindergarten|library|community_centre|social_facility)$"];
  relation(area.rio)["amenity"~"^(school|hospital|clinic|university|college|kindergarten|library|community_centre|social_facility)$"];
  way(area.rio)["waterway"];
  relation(area.rio)["waterway"];
  way(area.rio)["natural"~"^(water|wetland|wood)$"];
  relation(area.rio)["natural"~"^(water|wetland|wood)$"];
  way(area.rio)["leisure"~"^(park|garden|nature_reserve|recreation_ground|pitch)$"];
  relation(area.rio)["leisure"~"^(park|garden|nature_reserve|recreation_ground|pitch)$"];
  way(area.rio)["landuse"~"^(forest|grass|meadow|recreation_ground|cemetery)$"];
  relation(area.rio)["landuse"~"^(forest|grass|meadow|recreation_ground|cemetery)$"];
);
out body;
>;
out skel qt;
