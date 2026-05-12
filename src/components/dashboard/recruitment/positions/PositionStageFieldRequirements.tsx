import React from 'react';
import { StageFieldRequirementsTab } from '../admin/scoring/StageFieldRequirementsTab';

interface Props {
  positionId: string;
}

const PositionStageFieldRequirements: React.FC<Props> = ({ positionId }) => (
  <StageFieldRequirementsTab positionId={positionId} />
);

export default PositionStageFieldRequirements;
