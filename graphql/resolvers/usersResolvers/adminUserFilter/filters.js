// AdminFilter/filters.js
export const buildUserFilters = ({
  county,
  subcounty,
  ward,
  role,
  isFlagged,
  freeze,
  isApproved,
  isActivated
}) => {
  const match = {};

  if (county) match.county = county;
  if (subcounty) match.subcounty = subcounty;
  if (ward) match.ward = ward;
  if (role) match.role = role;
  if (isFlagged !== undefined) match.isFlagged = isFlagged;
  if (freeze !== undefined) match.freeze = freeze;
  if (isApproved !== undefined) match.isApproved = isApproved;
  if (isActivated !== undefined) match.isActivated = isActivated;

  return match;
};
