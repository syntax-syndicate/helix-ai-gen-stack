import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Row from '../widgets/Row';
import Cell from '../widgets/Cell';
import AppAPIKeysDataGrid from '../datagrid/AppAPIKeys';
import StringArrayEditor from '../widgets/StringArrayEditor';
import { IApiKey } from '../../types';

interface APIKeysManagerProps {
  apiKeys: IApiKey[];
  onAddAPIKey: () => void;
  onDeleteKey: (key: string) => void;
  allowedDomains: string[];
  setAllowedDomains: (domains: string[]) => void;
  isReadOnly: boolean;
}

const APIKeysManager: React.FC<APIKeysManagerProps> = ({
  apiKeys,
  onAddAPIKey,
  onDeleteKey,
  allowedDomains,
  setAllowedDomains,
  isReadOnly,
}) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" sx={{mb: 1}}>
        App-scoped API Keys
      </Typography>
      <Typography variant="caption" sx={{lineHeight: '3', color: '#999'}}>
        Using this key will automatically force all requests to use this app.
      </Typography>
      <Row>
        <Cell grow>
          <Typography variant="subtitle1" sx={{mb: 1}}>
            API Keys
          </Typography>
        </Cell>
        <Cell>
          <Button
            size="small"
            variant="outlined"
            endIcon={<AddCircleIcon />}
            onClick={onAddAPIKey}
            disabled={isReadOnly}
          >
            Add API Key
          </Button>
        </Cell>
      </Row>
      <Box sx={{ height: '300px' }}>
        <AppAPIKeysDataGrid
          data={apiKeys}
          onDeleteKey={onDeleteKey}
        />
      </Box>
      <Typography variant="subtitle1" sx={{ mt: 4 }}>
        Allowed Domains (website widget)
      </Typography>
      <Typography variant="caption" sx={{lineHeight: '1', color: '#999', padding: '8px 0'}}>
        The domain where your app is hosted. http://localhost and http://localhost:port are always allowed.
        Ensures the website chat widget can work for your custom domain.
      </Typography>
      <StringArrayEditor
        entityTitle="domain"
        disabled={isReadOnly}
        data={allowedDomains}
        onChange={setAllowedDomains}
      />
    </Box>
  );
};

export default APIKeysManager;