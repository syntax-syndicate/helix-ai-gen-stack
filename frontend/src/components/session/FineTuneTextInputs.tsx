import React, { FC, useState, useCallback, useEffect, useRef } from 'react'
import { prettyBytes } from '../../utils/format'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import useThemeConfig from '../../hooks/useThemeConfig'
import useTheme from '@mui/material/styles/useTheme'

import AddCircleIcon from '@mui/icons-material/AddCircle'
import AddIcon from '@mui/icons-material/Add'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ArrowCircleRightIcon from '@mui/icons-material/ArrowCircleRight'
import AttachFileIcon from '@mui/icons-material/AttachFile';
import TextFieldsIcon from '@mui/icons-material/TextFields'

import FileUpload from '../widgets/FileUpload'
import Row from '../widgets/Row'
import Cell from '../widgets/Cell'
import Caption from '../widgets/Caption'

import useSnackbar from '../../hooks/useSnackbar'
import InteractionContainer from './InteractionContainer'
import Link from '@mui/material/Link';
import Drawer from '@mui/material/Drawer';
import CloseIcon from '@mui/icons-material/Close'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import DeleteIcon from '@mui/icons-material/Delete'
import LinkIcon from '@mui/icons-material/Link'
import Divider from '@mui/material/Divider';


import {
  buttonStates,
} from '../../types'

import {
  mapFileExtension,
} from '../../utils/filestore'
import { ListItem, ListItemButton, ListItemText, ListItemIcon, IconButton, List } from '@mui/material'

interface CustomFile {
  file: File;
  type: 'text' | 'url' | 'file' ;
  content?: string; // Optional property to store the text content
}

interface FineTuneTextInputsProps {
  initialCounter?: number;
  initialFiles?: File[];
  showButton?: boolean;
  hideTextField?: boolean; // Changed from 'false' to 'boolean' to allow both true and false
  showSystemInteraction?: boolean;
  onChange?: (counter: number, files: File[]) => void;
  onDone?: (manuallyReviewQuestions?: boolean) => void;
}

export const FineTuneTextInputs: FC<FineTuneTextInputsProps> = ({
  initialCounter,
  initialFiles,
  showButton = false,
  hideTextField = false,
  showSystemInteraction = true,
  onChange,
  onDone,
}) => {
  const snackbar = useSnackbar()

  const [manualTextFileCounter, setManualTextFileCounter] = useState(initialCounter || 0)
  const [manualTextFile, setManualTextFile] = useState('')
  const [manualURL, setManualURL] = useState('')
  const [manuallyReviewQuestions, setManuallyReviewQuestions] = useState(false)
  // If initialFiles is an array of File objects, map it to an array of CustomFile objects
const [files, setFiles] = useState<CustomFile[]>(
  initialFiles?.map(file => ({ file, type: 'file' as 'text' | 'url' | 'file' })) || []
);
  const themeConfig = useThemeConfig()
  const theme = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false);
  

  const onAddURL = useCallback(() => {
    if (!manualURL.match(/^https?:\/\//i)) {
      snackbar.error(`Please enter a valid URL`);
      return;
    }
    let useUrl = manualURL.replace(/\/$/i, '');
    useUrl = decodeURIComponent(useUrl);
    let fileTitle = useUrl
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '');
    const newFile: CustomFile = {
      file: new File([new Blob([manualURL], { type: 'text/html' })], `${fileTitle}.url`),
      type: 'url' // Assuming 'url' is one of the types defined in the CustomFile interface
    };
    setFiles([...files, newFile]);
    setManualURL('');
  }, [manualURL, files]);
  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
  
    setDrawerOpen(open);
  };

  const onAddTextFile = useCallback(() => {
    const newCounter = manualTextFileCounter + 1;
    setManualTextFileCounter(newCounter);
    const newFile: CustomFile = {
      file: new File([new Blob([manualTextFile], { type: 'text/plain' })], `textfile-${newCounter}.txt`),
      type: 'text', // Assuming 'text' is one of the types defined in the CustomFile interface
      content: manualTextFile // Store the actual text content here
    };
    setFiles([...files, newFile]);
    setManualTextFile('');
  }, [manualTextFile, manualTextFileCounter, files]);

  const onDropFiles = useCallback(async (newFiles: File[]) => {
    const existingFiles = files.reduce<Record<string, boolean>>((all, customFile) => {
      all[customFile.file.name] = true;
      return all;
    }, {});
  
    const filteredNewFiles: CustomFile[] = newFiles
      .filter(file => !existingFiles[file.name])
      .map(file => ({ file, type: 'file' })); // Assuming 'file' is a valid type for CustomFile
  
    setFiles(files.concat(filteredNewFiles));
  }, [files]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = event.target.files;
    if (newFiles) {
      const fileArray: CustomFile[] = Array.from(newFiles).map(file => ({
        file: file,
        type: 'file' // This type should match one of the types defined in the CustomFile interface
      }));
      setFiles(currentFiles => [...currentFiles, ...fileArray]);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset the input
      }
    }
  };

  const handleManualUploadClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (!onChange) return;
    // Extract the File objects from the CustomFile array
    const fileArray = files.map(customFile => customFile.file);
    onChange(manualTextFileCounter, fileArray);
  }, [
    manualTextFileCounter,
    files,
  ]);

  function handleDownloadFile(file: File): void {
    throw new Error('Function not implemented.')
  }

  function handleRemoveFile(index: number): void {
    setFiles(currentFiles => currentFiles.filter((_, i) => i !== index));
    throw new Error('Function not implemented.')
  }

  return (
    <Box
      sx={{
        mt: 2,
        width: '100%',
      }}
    >
      
      {
        showSystemInteraction && (
          <Box
            sx={{
              mt: 4,
              mb: 10,
              
            }}
          >
           
              <Typography  sx={{
    fontWeight: 'bold', 
  }}className="interactionMessage">
                Add URLs, paste some text or upload some files you want your model to learn from:
              </Typography>
          
          </Box>
        )
      }
           <Typography
    sx={{
      width: '100%',
      pb: 4,
      fontSize: '1rem', // Example size, adjust as needed
      fontWeight: 'bold', 
    }}
  >
  Links
  </Typography>
      <Row
        sx={{
          
          mb: 0,
          alignItems: 'flex-start',
       
          flexDirection: {
            xs: 'column',
            sm: 'column',
            md: 'row'
          }
        }}
      >
   
        <Cell
          sx={{
            width: '100%',
            flexGrow: 1,
            pr: 0.5,
            pb: 1,
            display: 'flex', 
            alignItems: 'flex-start',
          }}
        >
          
          <TextField
            fullWidth
            label="Type or paste a link (eg https://google.com)"
            value={manualURL}
            onChange={(e) => setManualURL(e.target.value)}
            sx={{
              height: '100px',
        maxHeight: '100px',
              pb: 1,
              // backgroundColor: `${theme.palette.mode === 'light' ? themeConfig.lightBackgroundColor : themeConfig.darkBackgroundColor}80`,
              borderRadius: 0,
              
            }}
            InputProps={{
              style: { borderRadius: 0 }, 
              endAdornment: (
                <IconButton
                  onClick={onAddURL}
                  sx={{
                    marginLeft: 'auto',
                    height: '40px',
                     backgroundColor: 'transparent',
                   
                  }}
                >
                  <AddIcon sx={{  color: '#ffff00' }} />
                </IconButton>
              ),
            }}
          />
        </Cell>
      </Row>
      <Typography
    sx={{
      width: '100%',
      pb: 4,
      fontSize: '1rem', // Example size, adjust as needed
      fontWeight: 'bold', 
    }}
  >
  Text
  </Typography>
      <Row
  sx={{
    mb: 2,
    alignItems: 'flex-start',
    flexDirection: {
      xs: 'column',
      sm: 'column',
      md: 'row'
    }
  }}
>
  <Cell
    sx={{
      width: '100%',
      pb: 1,
      flexGrow: 1,
      pr: 0,
      alignItems: 'flex-start',
    }}
  >
    <TextField
      sx={{
        height: '100px',
        maxHeight: '100px',
        pb: 1,
        // backgroundColor: `${theme.palette.mode === 'light' ? themeConfig.lightBackgroundColor : themeConfig.darkBackgroundColor}80`,
       
      }}
      fullWidth
      label="paste some text here"
      value={manualTextFile}
      multiline
      rows={3}
      onChange={(e) => {
        setManualTextFile(e.target.value)
      }}
      InputProps={{
        style: { borderRadius: 0 }, 
        endAdornment: (
          <IconButton
            onClick={onAddTextFile}
            sx={{
              height: '40px',
              backgroundColor: 'transparent',
             
            }}
          >
            <AddIcon sx={{  color: '#ffff00' }} />
          </IconButton>
        ),
      }}
    />
  </Cell>
</Row>

<Typography
    sx={{
      width: '100%',
      pb: 4,
      fontSize: '1rem', // Example size, adjust as needed
      fontWeight: 'bold', 
    }}
  >
  Files
  </Typography>

<FileUpload
  sx={{
    width: '100%',
  }}
  onlyDocuments
  onUpload={onDropFiles}
>
  
  <Row
    sx={{
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: {
        xs: 'column',
        sm: 'column',
        md: 'row'
      }
    }}
  >
    <Cell
      sx={{
        width: '100%',
        flexGrow: 1,
        pr: 0,
        pb: 1,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          border: '1px solid #333333',
          borderRadius: 0,
          p: 2,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: '120px',
          minHeight: '120px',
          cursor: 'pointer',
          backgroundColor: `${theme.palette.mode === 'light' ? themeConfig.lightBackgroundColor : themeConfig.darkBackgroundColor}80`,
        }}
        onClick={handleManualUploadClick} // Use the function to trigger file input click
      >
        <Typography
          sx={{
            color: '#bbb',
           
           
          }}
        >
          Drag files here to upload or
        </Typography>
        <Typography
          sx={{
            color: '#bbb',
            textDecoration: 'underline',
            cursor: 'pointer',
            ml: 2,
          }}
          onClick={handleManualUploadClick} // Use the function to trigger file input click
        >
          upload manually
        </Typography>
      </Box>
      <input
    type="file"
    ref={fileInputRef}
    style={{ display: 'none' }}
    onChange={handleFileInputChange}
    multiple
  />
    </Cell>
  </Row>
  
</FileUpload>

<Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
  
</Box>


      <Box
        sx={{
          mt: 2,
          mb: 2,
        }}
      >
        <Grid container spacing={3} direction="row" justifyContent="flex-start">
          {
            files.length > 0 && files.map((customFile, index) =>{
              const IconComponent = customFile.type === 'url' ? LinkIcon : TextFieldsIcon;
              return (
                <Grid item xs={12} md={2} key={customFile.file.name}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      color: '#999'
                    }}
                  >
                    <IconComponent sx={{ mr: 1 }} />
                    <Caption sx={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {customFile.file.name}
                    </Caption>
                    {/* <Caption>
                      ({prettyBytes(customFile.file.size)})
                    </Caption> */}
                  </Box>
                </Grid>
              )
            })
              
          }
        </Grid>
      </Box>
     
      <Grid container spacing={3} direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 10, mb: 2 }}>
  <Grid item xs={6}>
    {files.length > 0 && (
      <Typography sx={{ display: 'inline-flex', textAlign: 'left'}}>
        {files.length} file{files.length !== 1 ? 's' : ''} added.
        <Link
        component="button"
        onClick={() => setDrawerOpen(true)}
        sx={{ ml: 0.5, textDecoration: 'underline',  color: '#ffff00',}}
      >
        View or edit files
      </Link>
      </Typography>
    )}
  </Grid>
  <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
    {files.length > 0 && showButton && onDone && (
      <Button
        sx={{
          bgcolor: '#ffff00', 
          color: 'black', 
          borderRadius: 1,
          fontSize: "medium",
          fontWeight: 800,
          textTransform: 'none', 
        }}
        variant="contained"
        onClick={() => onDone(manuallyReviewQuestions)}
      >
        Continue
      </Button>
    )}
  </Grid>
</Grid>
<Drawer
  anchor="right"
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  sx={{
    '& .MuiDrawer-paper': {
      backgroundColor: 'transparent', 
      height: '50vh'// Assuming each file item is 48px tall
      // overflowY: 'auto', // Allows scrolling if the content is taller than the drawer
    },
  }}
>
<Box
    sx={{
      width: 506, // or you can use a percentage like '50vw' for 50% of the viewport width
      maxWidth: '100%', // Ensure it doesn't exceed the viewport width
    }}
    role="presentation"
  >
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 16px',
      borderBottom: '1px solid #e0e0e0', // optional border for visual separation
    }}
  >
    <Typography variant="h6">
      Browse files ({files.length})
    </Typography>
    <IconButton onClick={() => setDrawerOpen(false)}>
      <CloseIcon /> {/* Make sure to import CloseIcon from @mui/icons-material */}
    </IconButton>
  </Box>

  {/* Drawer content: List of links, text, and files */}
  

{/* Drawer content: List of links, text, and files */}
<List>
  {files.map((customFile, index) => ( // Ensure 'customFile' is used as the parameter name here
   <React.Fragment key={customFile.file.name}>
   <ListItem
     sx={{
       display: 'flex',
       justifyContent: 'space-between',
       alignItems: 'center',
      
       
     }} secondaryAction={
      <Box sx={{ display: 'flex' }}>
        {/* Download Icon */}
        <IconButton edge="end" aria-label="download" onClick={() => handleDownloadFile(customFile.file)}>
          <FileDownloadIcon />
        </IconButton>
        {/* Delete Icon */}
        <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(index)}>
          <DeleteIcon />
        </IconButton>
      </Box>
    }>
      <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
        {customFile.type === 'url' && <LinkIcon />}
        {customFile.type === 'text' && <TextFieldsIcon />}
      </ListItemIcon>
      <ListItemText primary={customFile.type === 'text' ? customFile.content : customFile.file.name} sx={{ mr: 4,  whiteSpace: 'nowrap',
    overflow: 'hidden',
     textOverflow: 'ellipsis',
    
  
     }} />
    </ListItem>
    {index < files.length - 1 && (
        <Divider sx={{   my: 0 }} /> // Explicitly set the color for visibility
      )}
    </React.Fragment>
  ))}
</List>


  </Box>
</Drawer>
{!hideTextField && (
        <TextField
          // ... TextField props
        />
      )}
      {/* ... other component JSX */}
</Box>
  )
      }


export default FineTuneTextInputs