import { stationKeyboardNavSuite } from './_helpers/station-keyboard';

// Roving arrow-key navigation for the /tiangong module + visiting-vehicle
// list. Shared with /iss via the station-keyboard helper — the two routes
// are structural twins built on createStationSelectionService.
stationKeyboardNavSuite({ route: '/tiangong', listTestId: 'tiangong-list-view' });
