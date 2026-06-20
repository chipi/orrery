import { stationKeyboardNavSuite } from './_helpers/station-keyboard';

// Roving arrow-key navigation for the /iss module + visiting-vehicle
// list. Shared with /tiangong via the station-keyboard helper — the two
// routes are structural twins built on createStationSelectionService.
stationKeyboardNavSuite({ route: '/iss', listTestId: 'iss-list-view' });
