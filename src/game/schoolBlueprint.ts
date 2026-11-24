import type { ColliderBox } from './rules';

export interface BlueprintRoom {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  wing: 'west' | 'center' | 'east' | 'north' | 'exterior';
  kind: 'room' | 'corridor' | 'restroom' | 'stairs' | 'gate' | 'parking' | 'secret';
  labelEn: string;
  labelVi: string;
}

export interface FloorBlueprint {
  floorId: number; // -1 = B1, 1..6 = F1..F6, 7 = ROOF
  elevationY: number;
  code: string;
  nameEn: string;
  nameVi: string;
  rooms: BlueprintRoom[];
}

export interface ZoneBounds {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  isOutdoor?: boolean;
}

export interface StairFlightSpec {
  id: string;
  shaft: 'basement' | 'A' | 'B';
  fromFloor: number;
  toFloor: number;
  fromY: number;
  toY: number;
  cx: number;
  minX: number;
  maxX: number;
  startZ: number;
  endZ: number;
  floorGrpY: number;
}

export const FLOOR_ELEVATIONS: readonly number[] = [-4, 0, 4, 8, 12, 16, 20, 24];

export const BUILDING_FOOTPRINT = {
  minX: -26.2,
  maxX: 24.2,
  minZ: -32.2,
  maxZ: 20.2,
} as const;

export const ROOF_DECK_BOUNDS = {
  minX: -18.5,
  maxX: 18.5,
  minZ: -22.5,
  maxZ: 4.5,
} as const;

export const BASEMENT_BOUNDS = {
  minX: -25.5,
  maxX: 4.5,
  minZ: -24.5,
  maxZ: 6.5,
} as const;

export const STAIR_FLIGHTS: StairFlightSpec[] = [
  {
    id: 'stair_f1_to_b1',
    shaft: 'basement',
    fromFloor: -1,
    toFloor: 1,
    fromY: 0,
    toY: -4,
    cx: -4.1,
    minX: -5.8,
    maxX: -2.4,
    startZ: -4,
    endZ: -14,
    floorGrpY: -4,
  },
  {
    id: 'stair_f1_to_f2',
    shaft: 'A',
    fromFloor: 1,
    toFloor: 2,
    fromY: 0,
    toY: 4,
    cx: 4.0,
    minX: 2.35,
    maxX: 5.65,
    startZ: -4,
    endZ: -14,
    floorGrpY: 0,
  },
  {
    id: 'stair_f2_to_f3',
    shaft: 'B',
    fromFloor: 2,
    toFloor: 3,
    fromY: 4,
    toY: 8,
    cx: 7.4,
    minX: 5.75,
    maxX: 9.05,
    startZ: -14,
    endZ: -4,
    floorGrpY: 4,
  },
  {
    id: 'stair_f3_to_f4',
    shaft: 'A',
    fromFloor: 3,
    toFloor: 4,
    fromY: 8,
    toY: 12,
    cx: 4.0,
    minX: 2.35,
    maxX: 5.65,
    startZ: -4,
    endZ: -14,
    floorGrpY: 8,
  },
  {
    id: 'stair_f4_to_f5',
    shaft: 'B',
    fromFloor: 4,
    toFloor: 5,
    fromY: 12,
    toY: 16,
    cx: 7.4,
    minX: 5.75,
    maxX: 9.05,
    startZ: -14,
    endZ: -4,
    floorGrpY: 12,
  },
  {
    id: 'stair_f5_to_f6',
    shaft: 'A',
    fromFloor: 5,
    toFloor: 6,
    fromY: 16,
    toY: 20,
    cx: 4.0,
    minX: 2.35,
    maxX: 5.65,
    startZ: -4,
    endZ: -14,
    floorGrpY: 16,
  },
  {
    id: 'stair_f6_to_roof',
    shaft: 'B',
    fromFloor: 6,
    toFloor: 7,
    fromY: 20,
    toY: 24,
    cx: 7.4,
    minX: 5.75,
    maxX: 9.05,
    startZ: -14,
    endZ: -4,
    floorGrpY: 20,
  },
];

function upperFloorBaseRooms(
  prefix: string,
  floorNum: number,
  labels: {
    swRoomEn: string;
    swRoomVi: string;
    swFrontWEn: string;
    swFrontWVi: string;
    swFrontEEn: string;
    swFrontEVi: string;
    seMidWEn: string;
    seMidWVi: string;
    seMidEEn: string;
    seMidEVi: string;
    seFrontWEn: string;
    seFrontWVi: string;
    seFrontEEn: string;
    seFrontEVi: string;
    westMidEn: string;
    westMidVi: string;
    eastMidEn: string;
    eastMidVi: string;
    northWEn: string;
    northWVi: string;
    northCEn: string;
    northCVi: string;
    northEEn: string;
    northEVi: string;
    westMidKind?: BlueprintRoom['kind'];
    northWKind?: BlueprintRoom['kind'];
    includeSecretCorridor?: boolean;
  }
): BlueprintRoom[] {
  const oddUpper = floorNum % 2 === 1; // F3(3), F5(5): Shaft B down, Shaft A up
  const stairADesc = oddUpper ? `Stairs ↑ F${floorNum + 1}` : `Stairs ↓ F${floorNum - 1}`;
  const stairADescVi = oddUpper ? `Cầu Thang ↑ T${floorNum + 1}` : `Cầu Thang ↓ T${floorNum - 1}`;
  const nextLabel = floorNum === 6 ? 'ROOF' : `F${floorNum + 1}`;
  const nextLabelVi = floorNum === 6 ? 'Sân Thượng' : `T${floorNum + 1}`;
  const stairBDesc = oddUpper ? `Stairs ↓ F${floorNum - 1}` : `Stairs ↑ ${nextLabel}`;
  const stairBDescVi = oddUpper ? `Cầu Thang ↓ T${floorNum - 1}` : `Cầu Thang ↑ ${nextLabelVi}`;

  const rooms: BlueprintRoom[] = [
    { id: `${prefix}_cc`, x: 0, z: 0.5, w: 4.4, d: 39, wing: 'center', kind: 'corridor', labelEn: `${floorNum}F Central Corridor`, labelVi: `Hành Lang Giữa T${floorNum}` },
    { id: `${prefix}_wcorr`, x: -12.1, z: 3, w: 19.8, d: 4, wing: 'west', kind: 'corridor', labelEn: `${floorNum}F West Corridor`, labelVi: `Hành Lang Tây T${floorNum}` },
    { id: `${prefix}_ecorr`, x: 12.1, z: 3, w: 19.8, d: 4, wing: 'east', kind: 'corridor', labelEn: `${floorNum}F East Corridor`, labelVi: `Hành Lang Đông T${floorNum}` },
    { id: `${prefix}_ncorr`, x: 1, z: -17, w: 46, d: 4, wing: 'north', kind: 'corridor', labelEn: `${floorNum}F North Corridor`, labelVi: `Hành Lang Bắc T${floorNum}` },
    { id: `${prefix}_stair_a`, x: 4.0, z: -9, w: 3.2, d: 10, wing: 'center', kind: 'stairs', labelEn: stairADesc, labelVi: stairADescVi },
    { id: `${prefix}_stair_b`, x: 7.4, z: -9, w: 3.2, d: 10, wing: 'center', kind: 'stairs', labelEn: stairBDesc, labelVi: stairBDescVi },
    { id: `${prefix}_wc`, x: -19, z: 9, w: 6, d: 8, wing: 'west', kind: 'restroom', labelEn: `${floorNum}F Restrooms`, labelVi: `Nhà Vệ Sinh T${floorNum}` },
    { id: `${prefix}_sw_in`, x: -9.1, z: 9, w: 13.8, d: 8, wing: 'west', kind: 'room', labelEn: labels.swRoomEn, labelVi: labels.swRoomVi },
    { id: `${prefix}_sw_fw`, x: -17, z: 16.5, w: 10, d: 7, wing: 'west', kind: 'room', labelEn: labels.swFrontWEn, labelVi: labels.swFrontWVi },
    { id: `${prefix}_sw_fe`, x: -7.1, z: 16.5, w: 9.8, d: 7, wing: 'west', kind: 'room', labelEn: labels.swFrontEEn, labelVi: labels.swFrontEVi },
    { id: `${prefix}_se_w`, x: 7.1, z: 9, w: 9.8, d: 8, wing: 'east', kind: 'room', labelEn: labels.seMidWEn, labelVi: labels.seMidWVi },
    { id: `${prefix}_se_e`, x: 17, z: 9, w: 10, d: 8, wing: 'east', kind: 'room', labelEn: labels.seMidEEn, labelVi: labels.seMidEVi },
    { id: `${prefix}_se_fw`, x: 7.1, z: 16.5, w: 9.8, d: 7, wing: 'east', kind: 'room', labelEn: labels.seFrontWEn, labelVi: labels.seFrontWVi },
    { id: `${prefix}_se_fe`, x: 17, z: 16.5, w: 10, d: 7, wing: 'east', kind: 'room', labelEn: labels.seFrontEEn, labelVi: labels.seFrontEVi },
    { id: `${prefix}_east_m`, x: 15.55, z: -7, w: 12.9, d: 16, wing: 'east', kind: 'room', labelEn: labels.eastMidEn, labelVi: labels.eastMidVi },
    { id: `${prefix}_north_w`, x: -14, z: -25.5, w: 16, d: 13, wing: 'north', kind: labels.northWKind ?? 'room', labelEn: labels.northWEn, labelVi: labels.northWVi },
    { id: `${prefix}_north_c`, x: 2, z: -25.5, w: 16, d: 13, wing: 'north', kind: 'room', labelEn: labels.northCEn, labelVi: labels.northCVi },
    { id: `${prefix}_north_e`, x: 17, z: -25.5, w: 14, d: 13, wing: 'north', kind: 'room', labelEn: labels.northEEn, labelVi: labels.northEVi },
  ];

  if (labels.includeSecretCorridor) {
    rooms.push(
      { id: `${prefix}_west_m`, x: -14, z: -7, w: 16, d: 16, wing: 'west', kind: labels.westMidKind ?? 'room', labelEn: labels.westMidEn, labelVi: labels.westMidVi },
      { id: `${prefix}_secret_corr`, x: -4.1, z: -7, w: 3.8, d: 16, wing: 'west', kind: 'secret', labelEn: 'Secret Corridor', labelVi: 'Hành Lang Bí Mật' }
    );
  } else {
    rooms.push({
      id: `${prefix}_west_m`,
      x: -12.1,
      z: -7,
      w: 19.8,
      d: 16,
      wing: 'west',
      kind: labels.westMidKind ?? 'room',
      labelEn: labels.westMidEn,
      labelVi: labels.westMidVi,
    });
  }

  return rooms;
}

export const SCHOOL_FLOOR_PLANS: FloorBlueprint[] = [
  {
    floorId: -1,
    elevationY: -4,
    code: 'B1',
    nameEn: 'Basement & Maintenance Tunnels',
    nameVi: 'Tầng Hầm & Đường Hầm Kỹ Thuật',
    rooms: [
      { id: 'b1_boiler', x: -13.5, z: -18, w: 23, d: 12, wing: 'west', kind: 'room', labelEn: 'Boiler Hall', labelVi: 'Phòng Lò Hơi' },
      { id: 'b1_tunnel_w', x: -22, z: -5, w: 6, d: 14, wing: 'west', kind: 'corridor', labelEn: 'West Tunnel', labelVi: 'Hầm Tây' },
      { id: 'b1_tunnel_s', x: -7.5, z: 4, w: 23, d: 4, wing: 'center', kind: 'corridor', labelEn: 'South Sub-Corridor', labelVi: 'Hành Lang Hầm Nam' },
      { id: 'b1_stairs', x: -4.1, z: -9, w: 3.4, d: 10, wing: 'center', kind: 'stairs', labelEn: 'Basement Stairs ↑ F1', labelVi: 'Cầu Thang Lên Tầng 1' },
    ],
  },
  {
    floorId: 1,
    elevationY: 0,
    code: 'F1',
    nameEn: 'Main Entrance, Reception & Core Wing',
    nameVi: 'Tầng 1 — Cổng Chính, Lễ Tân & Khu Trung Tâm',
    rooms: [
      { id: 'f1_gate', x: 0, z: 50, w: 8, d: 4, wing: 'exterior', kind: 'gate', labelEn: 'Main Entrance Gate', labelVi: 'Cổng Chính Trường' },
      { id: 'f1_bike', x: -17, z: 40, w: 10, d: 8, wing: 'exterior', kind: 'parking', labelEn: 'Student Bicycle Parking', labelVi: 'Bãi Đỗ Xe Đạp' },
      { id: 'f1_car', x: 18, z: 40, w: 14, d: 15, wing: 'exterior', kind: 'parking', labelEn: 'Vehicle Parking Area', labelVi: 'Bãi Đỗ Ô Tô' },
      { id: 'f1_courtyard', x: 0, z: 33, w: 18, d: 24, wing: 'exterior', kind: 'corridor', labelEn: 'Courtyard & Playground', labelVi: 'Sân Trường & Xích Đu' },
      { id: 'f1_main_door', x: 0, z: 20, w: 3.2, d: 1.6, wing: 'center', kind: 'gate', labelEn: 'Main School Entrance', labelVi: 'Cửa Chính Trường' },
      { id: 'f1_rec', x: 0, z: 13, w: 14, d: 14, wing: 'center', kind: 'room', labelEn: 'Reception Hall', labelVi: 'Sảnh Lễ Tân' },
      { id: 'f1_security', x: -11.5, z: 16.5, w: 9, d: 7, wing: 'west', kind: 'room', labelEn: 'Security Room', labelVi: 'Phòng Bảo Vệ' },
      { id: 'f1_store_w', x: -19, z: 16.5, w: 6, d: 7, wing: 'west', kind: 'room', labelEn: '1F West Storage', labelVi: 'Kho Tây T1' },
      { id: 'f1_store_e1', x: 10.75, z: 16.5, w: 7.5, d: 7, wing: 'east', kind: 'room', labelEn: '1F Supply Storage', labelVi: 'Kho Vật Tư T1' },
      { id: 'f1_store_e2', x: 18.25, z: 16.5, w: 7.5, d: 7, wing: 'east', kind: 'room', labelEn: '1F Custodian Storage', labelVi: 'Kho Dụng Cụ T1' },
      { id: 'f1_cc', x: 0, z: -4.5, w: 4.4, d: 21, wing: 'center', kind: 'corridor', labelEn: 'Central Hallway', labelVi: 'Hành Lang Trung Tâm' },
      { id: 'f1_ncorr', x: 1, z: -17, w: 46, d: 4, wing: 'north', kind: 'corridor', labelEn: 'North Cross-Hallway', labelVi: 'Hành Lang Bắc T1' },
      { id: 'f1_stairs', x: 4.0, z: -9, w: 3.2, d: 10, wing: 'center', kind: 'stairs', labelEn: 'Grand Stairs ↑ F2', labelVi: 'Cầu Thang ↑ T2' },
      { id: 'f1_bstairs', x: -4.1, z: -9, w: 3.4, d: 10, wing: 'center', kind: 'stairs', labelEn: 'Basement Stairs ↓ B1', labelVi: 'Cầu Thang ↓ Hầm B1' },
      { id: 'f1_ecorr', x: 12.1, z: 3, w: 19.8, d: 4, wing: 'east', kind: 'corridor', labelEn: 'East Hallway', labelVi: 'Hành Lang Đông' },
      { id: 'f1_c101', x: 8, z: 9, w: 8, d: 8, wing: 'east', kind: 'room', labelEn: 'Classroom 101', labelVi: 'Phòng Học 101' },
      { id: 'f1_c102', x: 17, z: 9, w: 10, d: 8, wing: 'east', kind: 'room', labelEn: 'Classroom 102', labelVi: 'Phòng Học 102' },
      { id: 'f1_teach', x: 9, z: -3, w: 6, d: 8, wing: 'east', kind: 'room', labelEn: 'Teacher Offices', labelVi: 'Văn Phòng Giáo Viên' },
      { id: 'f1_store_n', x: 9, z: -11, w: 6, d: 8, wing: 'east', kind: 'room', labelEn: '1F Archive Storage', labelVi: 'Kho Lưu Trữ T1' },
      { id: 'f1_comp', x: 17, z: -7, w: 10, d: 16, wing: 'east', kind: 'room', labelEn: 'Computer Room', labelVi: 'Phòng Máy Tính' },
      { id: 'f1_wcorr', x: -12.1, z: 3, w: 19.8, d: 4, wing: 'west', kind: 'corridor', labelEn: 'West Hallway', labelVi: 'Hành Lang Tây' },
      { id: 'f1_prin', x: -11, z: 9, w: 10, d: 8, wing: 'west', kind: 'room', labelEn: 'Principal’s Office', labelVi: 'Phòng Hiệu Trưởng' },
      { id: 'f1_wc', x: -19, z: 9, w: 6, d: 8, wing: 'west', kind: 'restroom', labelEn: '1F Restrooms', labelVi: 'Nhà Vệ Sinh T1' },
      { id: 'f1_lib', x: -14, z: -7, w: 16, d: 16, wing: 'west', kind: 'room', labelEn: 'School Library', labelVi: 'Thư Viện Trường' },
      { id: 'f1_secret', x: -24, z: -10, w: 4, d: 10, wing: 'west', kind: 'secret', labelEn: 'Secret Archive', labelVi: 'Phòng Bí Mật' },
      { id: 'f1_inf', x: -17, z: -21, w: 10, d: 4, wing: 'north', kind: 'room', labelEn: 'Infirmary', labelVi: 'Phòng Y Tế' },
      { id: 'f1_kit', x: -17, z: -27.5, w: 10, d: 9, wing: 'north', kind: 'room', labelEn: 'Kitchen', labelVi: 'Nhà Bếp' },
      { id: 'f1_cafe', x: -5, z: -25.5, w: 14, d: 13, wing: 'north', kind: 'room', labelEn: 'Cafeteria', labelVi: 'Nhà Ăn' },
      { id: 'f1_sci', x: 7.5, z: -25.5, w: 11, d: 13, wing: 'north', kind: 'room', labelEn: 'Science Lab', labelVi: 'Phòng Khoa Học' },
      { id: 'f1_chem', x: 18.5, z: -25.5, w: 11, d: 13, wing: 'north', kind: 'room', labelEn: 'Chemistry Lab', labelVi: 'Phòng Hóa Học' },
    ],
  },
  {
    floorId: 2,
    elevationY: 4,
    code: 'F2',
    nameEn: 'Floor 2 — Classroom Area',
    nameVi: 'Tầng 2 — Khu Phòng Học & Văn Phòng',
    rooms: upperFloorBaseRooms('f2', 2, {
      swRoomEn: 'Teacher Office 2A',
      swRoomVi: 'Văn Phòng GV 2A',
      swFrontWEn: '2F West Storage',
      swFrontWVi: 'Kho Tây T2',
      swFrontEEn: 'Teacher Office 2B',
      swFrontEVi: 'Văn Phòng GV 2B',
      seMidWEn: 'Classroom 201',
      seMidWVi: 'Phòng Học 201',
      seMidEEn: 'Classroom 202',
      seMidEVi: 'Phòng Học 202',
      seFrontWEn: 'Classroom 203',
      seFrontWVi: 'Phòng Học 203',
      seFrontEEn: '2F East Storage',
      seFrontEVi: 'Kho Đông T2',
      westMidEn: 'Classroom 204',
      westMidVi: 'Phòng Học 204',
      eastMidEn: '2F Computer Room',
      eastMidVi: 'Phòng Máy Tính T2',
      northWEn: 'Classroom 205',
      northWVi: 'Phòng Học 205',
      northCEn: '2F Study Hall',
      northCVi: 'Phòng Tự Học T2',
      northEEn: '2F Faculty Room',
      northEVi: 'Phòng Hội Đồng GV T2',
    }),
  },
  {
    floorId: 3,
    elevationY: 8,
    code: 'F3',
    nameEn: 'Floor 3 — Library & Archive Area',
    nameVi: 'Tầng 3 — Khu Thư Viện & Lưu Trữ',
    rooms: upperFloorBaseRooms('f3', 3, {
      swRoomEn: 'Study Room 3A',
      swRoomVi: 'Phòng Tự Học 3A',
      swFrontWEn: 'Book Storage',
      swFrontWVi: 'Kho Sách T3',
      swFrontEEn: 'Study Room 3B',
      swFrontEVi: 'Phòng Tự Học 3B',
      seMidWEn: 'Classroom 301',
      seMidWVi: 'Phòng Học 301',
      seMidEEn: 'Reading Room',
      seMidEVi: 'Phòng Đọc Sách',
      seFrontWEn: 'Classroom 302',
      seFrontWVi: 'Phòng Học 302',
      seFrontEEn: '3F Book Bindery Storage',
      seFrontEVi: 'Kho Bảo Quản Sách',
      westMidEn: 'Main Upper Library',
      westMidVi: 'Thư Viện Chính T3',
      eastMidEn: 'Archive Room',
      eastMidVi: 'Phòng Lưu Trữ T3',
      northWEn: 'Rare Book Archive',
      northWVi: 'Kho Sách Hiếm T3',
      northCEn: 'Quiet Reading Hall',
      northCVi: 'Sảnh Đọc Tĩnh Lặng T3',
      northEEn: 'Librarian Workroom',
      northEVi: 'Phòng Thủ Thư T3',
    }),
  },
  {
    floorId: 4,
    elevationY: 12,
    code: 'F4',
    nameEn: 'Floor 4 — Science & Lab Area',
    nameVi: 'Tầng 4 — Khu Phòng Thí Nghiệm Khoa Học',
    rooms: upperFloorBaseRooms('f4', 4, {
      swRoomEn: 'Prep Room 4A',
      swRoomVi: 'Phòng Chuẩn Bị 4A',
      swFrontWEn: 'Equipment Storage',
      swFrontWVi: 'Kho Thiết Bị T4',
      swFrontEEn: 'Physics Lab',
      swFrontEVi: 'Phòng Vật Lý T4',
      seMidWEn: 'Classroom 401',
      seMidWVi: 'Phòng Học 401',
      seMidEEn: 'Classroom 402',
      seMidEVi: 'Phòng Học 402',
      seFrontWEn: 'Prep Room 4B',
      seFrontWVi: 'Phòng Chuẩn Bị 4B',
      seFrontEEn: 'Glassware Storage',
      seFrontEVi: 'Kho Dụng Cụ Thủy Tinh',
      westMidEn: 'Lab Equipment Storage',
      westMidVi: 'Kho Hóa Chất & Thiết Bị T4',
      eastMidEn: '4F Science Laboratory',
      eastMidVi: 'Phòng Khoa Học T4',
      northWEn: '4F Chemistry Lab',
      northWVi: 'Phòng Hóa Học T4',
      northCEn: 'Biology Research Lab',
      northCVi: 'Phòng Sinh Học T4',
      northEEn: 'Specimen Storage',
      northEVi: 'Kho Mẫu Vật T4',
    }),
  },
  {
    floorId: 5,
    elevationY: 16,
    code: 'F5',
    nameEn: 'Floor 5 — Restricted Administrative Area',
    nameVi: 'Tầng 5 — Khu Hành Chính Hạn Chế',
    rooms: upperFloorBaseRooms('f5', 5, {
      swRoomEn: 'Admin Office 5A',
      swRoomVi: 'Văn Phòng Hành Chính 5A',
      swFrontWEn: 'Sealed Records Room',
      swFrontWVi: 'Phòng Hồ Sơ Niêm Phong',
      swFrontEEn: 'Executive Office',
      swFrontEVi: 'Văn Phòng Điều Hành',
      seMidWEn: 'Restricted Room 501',
      seMidWVi: 'Phòng Hạn Chế 501',
      seMidEEn: 'Abandoned Office 502',
      seMidEVi: 'Văn Phòng Hoang 502',
      seFrontWEn: 'Restricted Storage',
      seFrontWVi: 'Kho Hạn Chế T5',
      seFrontEEn: 'Director Suite',
      seFrontEVi: 'Phòng Giám Đốc Cũ',
      westMidEn: 'Admin Vault',
      westMidVi: 'Kho Quản Trị T5',
      westMidKind: 'secret',
      eastMidEn: 'Quarantine Office',
      eastMidVi: 'Phòng Cách Ly T5',
      northWEn: 'Hidden Room 598',
      northWVi: 'Phòng Bí Ẩn 598',
      northWKind: 'secret',
      northCEn: 'Restricted Hall',
      northCVi: 'Đại Sảnh Cấm T5',
      northEEn: 'Abandoned Boardroom',
      northEVi: 'Phòng Họp Bỏ Hoang T5',
      includeSecretCorridor: true,
    }),
  },
  {
    floorId: 6,
    elevationY: 20,
    code: 'F6',
    nameEn: 'Floor 6 — Abandoned & Mystery Area',
    nameVi: 'Tầng 6 — Khu Bỏ Hoang & Bí Ẩn',
    rooms: upperFloorBaseRooms('f6', 6, {
      swRoomEn: 'Abandoned Class 601',
      swRoomVi: 'Phòng Học Hoang 601',
      swFrontWEn: 'Old Storage 6A',
      swFrontWVi: 'Kho Cũ 6A',
      swFrontEEn: 'Forgotten Class 602',
      swFrontEVi: 'Phòng Bị Lãng Quên 602',
      seMidWEn: 'Abandoned Class 603',
      seMidWVi: 'Phòng Học Hoang 603',
      seMidEEn: 'Forgotten Room 604',
      seMidEVi: 'Phòng Bị Lãng Quên 604',
      seFrontWEn: 'Old Storage 6B',
      seFrontWVi: 'Kho Cũ 6B',
      seFrontEEn: 'Dusty Archive',
      seFrontEVi: 'Kho Bụi T6',
      westMidEn: 'Mysterious Archive',
      westMidVi: 'Kho Lưu Trữ Bí Ẩn T6',
      westMidKind: 'secret',
      eastMidEn: 'Mystery Room 605',
      eastMidVi: 'Phòng Bí Ẩn 605',
      northWEn: 'Hidden Documents Vault',
      northWVi: 'Kho Tài Liệu Mật T6',
      northWKind: 'secret',
      northCEn: 'Forgotten Assembly Hall',
      northCVi: 'Hội Trường Bỏ Hoang T6',
      northEEn: 'Rooftop Access Prep',
      northEVi: 'Phòng Lên Sân Thượng',
    }),
  },
  {
    floorId: 7,
    elevationY: 24,
    code: 'ROOF',
    nameEn: 'School Rooftop',
    nameVi: 'Sân Thượng Trường Học',
    rooms: [
      { id: 'roof_main', x: 0, z: -9, w: 36, d: 26, wing: 'center', kind: 'room', labelEn: 'Rooftop Deck & Beacon', labelVi: 'Sân Thượng & Đèn Tín Hiệu' },
      { id: 'roof_stair', x: 7.4, z: -9, w: 3.2, d: 10, wing: 'center', kind: 'stairs', labelEn: 'Stairs ↓ F6', labelVi: 'Cầu Thang ↓ T6' },
      { id: 'roof_exit', x: 15.5, z: -18, w: 4, d: 4, wing: 'east', kind: 'gate', labelEn: 'Final Escape Hatch', labelVi: 'Cửa Thoát Hiểm Cuối' },
    ],
  },
];

export const ZONE_DEFINITIONS: ZoneBounds[] = [
  // Exterior Grounds
  { name: 'School Entrance Gate (Exterior)', minX: -12, maxX: 12, minZ: 48, maxZ: 68, minY: -1, maxY: 8, isOutdoor: true },
  { name: 'Student Bicycle Parking', minX: -26, maxX: -10, minZ: 34, maxZ: 48, minY: -1, maxY: 8, isOutdoor: true },
  { name: 'Vehicle Parking Area', minX: 10, maxX: 28, minZ: 31, maxZ: 49, minY: -1, maxY: 8, isOutdoor: true },
  { name: 'Outdoor Courtyard & Playground', minX: -50, maxX: 50, minZ: 20, maxZ: 68, minY: -1, maxY: 8, isOutdoor: true },

  // F1
  { name: 'Reception Hall & Main Entrance', minX: -7, maxX: 7, minZ: 6, maxZ: 20, minY: -0.5, maxY: 3.5 },
  { name: 'Security Room', minX: -16, maxX: -7, minZ: 13, maxZ: 20, minY: -0.5, maxY: 3.5 },
  { name: '1F West Storage Room', minX: -22, maxX: -16, minZ: 13, maxZ: 20, minY: -0.5, maxY: 3.5 },
  { name: '1F East Storage Rooms', minX: 7, maxX: 22, minZ: 13, maxZ: 20, minY: -0.5, maxY: 3.5 },
  { name: 'Classroom 101', minX: 4, maxX: 12, minZ: 5, maxZ: 13, minY: -0.5, maxY: 3.5 },
  { name: 'Classroom 102', minX: 12, maxX: 22, minZ: 5, maxZ: 13, minY: -0.5, maxY: 3.5 },
  { name: 'Teacher Offices', minX: 6, maxX: 12, minZ: -7, maxZ: 1, minY: -0.5, maxY: 3.5 },
  { name: '1F Archive Storage', minX: 6, maxX: 12, minZ: -15, maxZ: -7, minY: -0.5, maxY: 3.5 },
  { name: 'Computer Room', minX: 12, maxX: 22, minZ: -15, maxZ: 1, minY: -0.5, maxY: 3.5 },
  { name: 'Principal’s Office', minX: -16, maxX: -6, minZ: 5, maxZ: 13, minY: -0.5, maxY: 3.5 },
  { name: '1F Restrooms', minX: -22, maxX: -16, minZ: 5, maxZ: 13, minY: -0.5, maxY: 3.5 },
  { name: 'Hidden Secret Room', minX: -26, maxX: -22, minZ: -15, maxZ: -5, minY: -0.5, maxY: 3.5 },
  { name: 'School Library', minX: -22, maxX: -6, minZ: -15, maxZ: 1, minY: -0.5, maxY: 3.5 },
  { name: 'Science Laboratory', minX: 2, maxX: 13, minZ: -32, maxZ: -19, minY: -0.5, maxY: 3.5 },
  { name: 'Chemistry Laboratory', minX: 13, maxX: 24, minZ: -32, maxZ: -19, minY: -0.5, maxY: 3.5 },
  { name: 'Medical Room (Infirmary)', minX: -22, maxX: -12, minZ: -23, maxZ: -19, minY: -0.5, maxY: 3.5 },
  { name: 'Kitchen & Pantry', minX: -22, maxX: -12, minZ: -32, maxZ: -23, minY: -0.5, maxY: 3.5 },
  { name: 'School Cafeteria', minX: -12, maxX: 2, minZ: -32, maxZ: -19, minY: -0.5, maxY: 3.5 },
  { name: 'Underground Basement & Tunnels', minX: -26, maxX: 5, minZ: -25, maxZ: 7, minY: -5, maxY: -1.5 },
  { name: 'East Corridor (F1)', minX: 2.2, maxX: 22, minZ: 1, maxZ: 5, minY: -0.5, maxY: 3.5 },
  { name: 'West Corridor (F1)', minX: -22, maxX: -2.2, minZ: 1, maxZ: 5, minY: -0.5, maxY: 3.5 },
  { name: 'Central Corridor (F1)', minX: -3, maxX: 9.2, minZ: -19, maxZ: 6, minY: -0.5, maxY: 3.5 },

  // F2
  { name: 'Floor 2 — Restrooms', minX: -22, maxX: -16, minZ: 5, maxZ: 13, minY: 3.5, maxY: 7.5 },
  { name: 'Floor 2 — Computer Room', minX: 9.1, maxX: 22, minZ: -15, maxZ: 1, minY: 3.5, maxY: 7.5 },
  { name: 'Floor 2 — Classrooms & Offices', minX: -26, maxX: 26, minZ: -34, maxZ: 21, minY: 3.5, maxY: 7.5 },

  // F3
  { name: 'Floor 3 — Restrooms', minX: -22, maxX: -16, minZ: 5, maxZ: 13, minY: 7.5, maxY: 11.5 },
  { name: 'Floor 3 — Main Library & Reading', minX: -22, maxX: -2.2, minZ: -15, maxZ: 1, minY: 7.5, maxY: 11.5 },
  { name: 'Floor 3 — Upper Library & Archive', minX: -26, maxX: 26, minZ: -34, maxZ: 21, minY: 7.5, maxY: 11.5 },

  // F4
  { name: 'Floor 4 — Restrooms', minX: -22, maxX: -16, minZ: 5, maxZ: 13, minY: 11.5, maxY: 15.5 },
  { name: 'Floor 4 — Science & Chemistry Labs', minX: -22, maxX: 24, minZ: -32, maxZ: -19, minY: 11.5, maxY: 15.5 },
  { name: 'Floor 4 — Science & Equipment Wing', minX: -26, maxX: 26, minZ: -34, maxZ: 21, minY: 11.5, maxY: 15.5 },

  // F5
  { name: 'Floor 5 — Restrooms', minX: -22, maxX: -16, minZ: 5, maxZ: 13, minY: 15.5, maxY: 19.5 },
  { name: 'Floor 5 — Secret Corridor', minX: -6, maxX: -2.2, minZ: -15, maxZ: 1, minY: 15.5, maxY: 19.5 },
  { name: 'Floor 5 — Hidden Room 598', minX: -22, maxX: -6, minZ: -32, maxZ: -19, minY: 15.5, maxY: 19.5 },
  { name: 'Floor 5 — Restricted Admin Wing', minX: -26, maxX: 26, minZ: -34, maxZ: 21, minY: 15.5, maxY: 19.5 },

  // F6
  { name: 'Floor 6 — Restrooms', minX: -22, maxX: -16, minZ: 5, maxZ: 13, minY: 19.5, maxY: 23.5 },
  { name: 'Floor 6 — Mysterious Archive', minX: -26, maxX: 26, minZ: -34, maxZ: 21, minY: 19.5, maxY: 23.5 },

  // ROOF
  { name: 'School Rooftop', minX: -19, maxX: 19, minZ: -23, maxZ: 5, minY: 23.2, maxY: 28, isOutdoor: true },
];

export function groundHeightAt(x: number, z: number, currentY: number): number {
  // Basement stairwell ramp (x: -5.8..-2.4, z: -14..-4, 0 -> -4.0)
  if (x >= -5.9 && x <= -2.3 && z >= -14.15 && z <= -3.85 && currentY <= 1.8) {
    const t = Math.max(0, Math.min(1, (-4 - z) / 10));
    const candidate = -4.0 * t;
    if (Math.abs(candidate - currentY) <= 1.85) return candidate;
  }

  // Grand Central Multi-Floor Stairwell Shaft A (x: 2.35..5.65, z: -14..-4)
  // Odd ascents: 0->4, 8->12, 16->20
  if (x >= 2.35 && x <= 5.65 && z >= -14.15 && z <= -3.85 && currentY > -1.8) {
    const t = Math.max(0, Math.min(1, (-4 - z) / 10));
    const candidates = [0 + 4 * t, 8 + 4 * t, 16 + 4 * t];
    let best = candidates[0];
    let bestDist = Math.abs(best - currentY);
    for (let i = 1; i < candidates.length; i++) {
      const d = Math.abs(candidates[i] - currentY);
      if (d < bestDist) {
        bestDist = d;
        best = candidates[i];
      }
    }
    if (bestDist <= 1.85) return best;
  }

  // Grand Central Multi-Floor Stairwell Shaft B (x: 5.75..9.05, z: -14..-4)
  // Even ascents: 4->8, 12->16, 20->24 (sloping UP as z goes -14 -> -4)
  if (x >= 5.75 && x <= 9.05 && z >= -14.15 && z <= -3.85 && currentY >= 2.2) {
    const t = Math.max(0, Math.min(1, (z - -14) / 10));
    const candidates = [4 + 4 * t, 12 + 4 * t, 20 + 4 * t];
    let best = candidates[0];
    let bestDist = Math.abs(best - currentY);
    for (let i = 1; i < candidates.length; i++) {
      const d = Math.abs(candidates[i] - currentY);
      if (d < bestDist) {
        bestDist = d;
        best = candidates[i];
      }
    }
    if (bestDist <= 1.85) return best;
  }

  // Basement slab
  if (
    currentY <= -2.2 &&
    x >= BASEMENT_BOUNDS.minX &&
    x <= BASEMENT_BOUNDS.maxX &&
    z >= BASEMENT_BOUNDS.minZ &&
    z <= BASEMENT_BOUNDS.maxZ
  ) {
    return -4.0;
  }

  // Rooftop slab
  if (
    currentY >= 22.2 &&
    x >= ROOF_DECK_BOUNDS.minX &&
    x <= ROOF_DECK_BOUNDS.maxX &&
    z >= ROOF_DECK_BOUNDS.minZ &&
    z <= ROOF_DECK_BOUNDS.maxZ
  ) {
    return 24.0;
  }

  // Exterior ground terrain outside the 6-floor school envelope
  if (
    x < BUILDING_FOOTPRINT.minX ||
    x > BUILDING_FOOTPRINT.maxX ||
    z < BUILDING_FOOTPRINT.minZ ||
    z > BUILDING_FOOTPRINT.maxZ
  ) {
    return 0.0;
  }

  const nearestFloor = Math.round(currentY / 4) * 4;
  return Math.max(0, Math.min(20, nearestFloor));
}

export function getZoneAt(x: number, y: number, z: number): { name: string; isOutdoor: boolean } {
  for (let i = 0; i < ZONE_DEFINITIONS.length; i++) {
    const zn = ZONE_DEFINITIONS[i];
    if (
      x >= zn.minX &&
      x <= zn.maxX &&
      z >= zn.minZ &&
      z <= zn.maxZ &&
      y >= zn.minY &&
      y <= zn.maxY
    ) {
      return { name: zn.name, isOutdoor: Boolean(zn.isOutdoor) };
    }
  }
  return { name: 'Abandoned Wing', isOutdoor: false };
}

export interface SpawnValidationResult {
  valid: boolean;
  reason?: string;
  groundY: number;
}

export function validateSpawnPoint(
  pos: { x: number; y: number; z: number },
  colliders: ColliderBox[],
  groundFn: (x: number, z: number, curY: number) => number = groundHeightAt,
  radius = 0.36
): SpawnValidationResult {
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) {
    return { valid: false, reason: 'non-finite coordinates', groundY: 0 };
  }
  const groundY = groundFn(pos.x, pos.z, pos.y);
  if (Math.abs(groundY - pos.y) > 0.5) {
    return {
      valid: false,
      reason: `elevation mismatch (spawnY=${pos.y}, groundY=${groundY})`,
      groundY,
    };
  }

  const footMinY = pos.y + 0.25;
  const headMaxY = pos.y + 1.55;
  for (let i = 0; i < colliders.length; i++) {
    const box = colliders[i];
    if (box.active === false) continue;
    if (box.maxY <= footMinY || box.minY >= headMaxY) continue;
    const closestX = Math.max(box.minX, Math.min(pos.x, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    if (dx * dx + dz * dz < radius * radius - 1e-4) {
      return { valid: false, reason: `overlaps collider ${box.id}`, groundY };
    }
  }
  return { valid: true, groundY };
}

export function findSafeSpawnFallback(
  intended: { x: number; y: number; z: number },
  colliders: ColliderBox[],
  groundFn: (x: number, z: number, curY: number) => number = groundHeightAt
): { pos: { x: number; y: number; z: number }; fallbackUsed: boolean; reason?: string } {
  const initialCheck = validateSpawnPoint(intended, colliders, groundFn);
  if (initialCheck.valid) {
    return { pos: { x: intended.x, y: initialCheck.groundY, z: intended.z }, fallbackUsed: false };
  }

  const rings = [0.6, 1.2, 1.8, 2.5, 3.2];
  const angles = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, (3 * Math.PI) / 4, -(3 * Math.PI) / 4, Math.PI];
  for (const r of rings) {
    for (const a of angles) {
      const candidate = {
        x: intended.x + Math.cos(a) * r,
        y: intended.y,
        z: intended.z + Math.sin(a) * r,
      };
      const chk = validateSpawnPoint(candidate, colliders, groundFn);
      if (chk.valid) {
        return {
          pos: { x: candidate.x, y: chk.groundY, z: candidate.z },
          fallbackUsed: true,
          reason: initialCheck.reason,
        };
      }
    }
  }

  const emergency = { x: 0, y: Math.max(-4, Math.min(24, Math.round(intended.y / 4) * 4)), z: intended.z > 22 ? 55 : 3 };
  const emCheck = validateSpawnPoint(emergency, colliders, groundFn);
  if (emCheck.valid) {
    return {
      pos: { x: emergency.x, y: emCheck.groundY, z: emergency.z },
      fallbackUsed: true,
      reason: initialCheck.reason,
    };
  }

  return {
    pos: { x: 0, y: 0, z: 55 },
    fallbackUsed: true,
    reason: initialCheck.reason,
  };
}

export function computeMultiplayerSpawnPositions(
  baseSpawn: { x: number; y: number; z: number },
  playerCount: number
): Array<{ x: number; y: number; z: number }> {
  const offsets: Array<[number, number]> = [
    [0, 0],
    [-0.95, 0.7],
    [0.95, 0.7],
    [-0.95, -0.7],
    [0.95, -0.7],
  ];
  const count = Math.max(1, Math.min(8, playerCount));
  const out: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < count; i++) {
    const [ox, oz] = offsets[i % offsets.length];
    const extraRing = i >= offsets.length ? Math.floor(i / offsets.length) * 0.85 : 0;
    out.push({
      x: Number((baseSpawn.x + ox).toFixed(2)),
      y: baseSpawn.y,
      z: Number((baseSpawn.z + oz + extraRing).toFixed(2)),
    });
  }
  return out;
}

export const LEVEL_SPAWNS: Record<number, { x: number; y: number; z: number; yaw: number }> = {
  1: { x: 0, y: 0, z: 55, yaw: 0 },
  2: { x: 8, y: 0, z: 3.2, yaw: 0 },
  3: { x: -12, y: 0, z: -2.0, yaw: 0 },
  4: { x: 8, y: 0, z: -21, yaw: Math.PI },
  5: { x: 16, y: 0, z: -8, yaw: Math.PI / 2 },
  6: { x: -20, y: -4, z: -14, yaw: 0 },
  7: { x: -5.4, y: 0, z: -25.8, yaw: 0 },
  8: { x: 0, y: 0, z: 14, yaw: 0 },
  9: { x: 0, y: 0, z: 30, yaw: Math.PI },
  10: { x: 0, y: 24.0, z: -6, yaw: 0 },
};

export function getLevelSpawnPoint(level: number): { x: number; y: number; z: number; yaw: number } {
  const clamped = Math.max(1, Math.min(10, Math.floor(level)));
  return LEVEL_SPAWNS[clamped] ?? LEVEL_SPAWNS[1];
}

