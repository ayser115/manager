'use client';
import { useState } from 'react';
import { Container, Button, Typography, Box, Grid, Card, CardMedia, AppBar, IconButton, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import Papa from 'papaparse';
import { Parser } from 'json2csv';
import * as React from 'react';
import { styled, alpha } from '@mui/material/styles'; 
import Toolbar from '@mui/material/Toolbar';  
import InputBase from '@mui/material/InputBase';
import Badge from '@mui/material/Badge';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircle from '@mui/icons-material/AccountCircle';
import MailIcon from '@mui/icons-material/Mail';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MoreIcon from '@mui/icons-material/MoreVert';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

export function PrimarySearchAppBar({upFile, downeFile, length, setPage, totalPages}) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState(null);
  const [searchValue, setSearchValue] = React.useState('');

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      const pageNum = parseInt(searchValue);
      // التأكد أن الرقم ضمن نطاق الصفحات المتاحة
      if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
        setPage(pageNum - 1); // نطرح 1 لأن المصفوفة تبدأ من 0
      }
    }
  };
  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  const menuId = 'primary-search-account-menu';
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
      <MenuItem onClick={handleMenuClose}>My account</MenuItem>
    </Menu>
  );

  const mobileMenuId = 'primary-search-account-menu-mobile';
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      <MenuItem>
        <IconButton size="large" aria-label="show 4 new mails" color="inherit">
          <Badge badgeContent={4} color="error">
            <MailIcon />
          </Badge>
        </IconButton>
        <p>Messages</p>
      </MenuItem>
      <MenuItem>
        <IconButton
          size="large"
          aria-label="show 17 new notifications"
          color="inherit"
        >
          <Badge badgeContent={17} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <p>Notifications</p>
      </MenuItem>
      <MenuItem onClick={handleProfileMenuOpen}>
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="primary-search-account-menu"
          aria-haspopup="true"
          color="inherit"
        >
          <AccountCircle />
        </IconButton>
        <p>Profile</p>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ flexGrow: 1, direction:'ltr'  }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="open drawer"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            MUI
          </Typography>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
                placeholder="رقم الصفحة (Enter)..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
          </Search>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            <IconButton
             onClick={downeFile}
             size="large"  sx={{ color:length >0 ? '#00e53d' :'#0041e5b1' }} >
              <Badge max={999} badgeContent={length} color="error">
                <CloudDownloadIcon />
              </Badge>
            </IconButton> 
           <IconButton
              component="label" // تحويله إلى label ليفتح ملفات النظام
              size="large"
              edge="end"
              sx={{ color: '#dfff10' }} // تصحيح طريقة تلوين الأيقونة
            >
              <DriveFolderUploadIcon />
              <input type="file" hidden accept=".csv" onChange={upFile} />
            </IconButton>
          </Box>
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="show more"
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              color="inherit"
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {renderMobileMenu}
      {renderMenu}
    </Box>
  );
}

export default function Home() {
  const [allData, setAllData] = useState([]); // البيانات الخام كاملة (كل الصفوف) 
  const [currentPage, setCurrentPage] = useState(0); // الصفحة تبدأ من 0
  const productsPerPage = 50;
  // تجميع البيانات لعرضها (كل Handle يمثل منتجاً واحداً)
  const groupedProducts = allData.reduce((acc, curr) => {
    const handle = curr.Handle;
    if (!acc[handle]) {
      acc[handle] = { Handle: handle, Title: curr.Title, Images: [] };
    }
    if (curr['Image Src']) {
      acc[handle].Images.push({ src: curr['Image Src'], index: allData.indexOf(curr) });
    }
    return acc;
  }, {});

// الحصول على كل الـ Handles
const handles = Object.keys(groupedProducts);

// حساب الصفحات
const totalPages = Math.ceil(handles.length / productsPerPage);

// قص المصفوفة للعرض الحالي فقط (هذا يضمن عدم تحميل أكثر من 100 كارد في الذاكرة)
const displayedHandles = handles.slice(
  currentPage * productsPerPage, 
  (currentPage + 1) * productsPerPage
);

// دالة الانتقال للصفحة التالية
const nextPage = () => {
  if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
};

// دالة الانتقال للصفحة السابقة
const prevPage = () => {
  if (currentPage > 0) setCurrentPage(currentPage - 1);
};
  // 1. رفع ومعالجة الملف
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setAllData(results.data);
      },
    });
  };

 

  // 2. حذف منتج كامل (بناءً على الـ Handle)
  const deleteProductByHandle = (handle) => {
    setAllData(allData.filter((row) => row.Handle !== handle));
    // إذا حذفنا منتجات وأصبحنا في صفحة فارغة، نعود للبداية
  if (currentPage >= totalPages - 1 && currentPage > 0) {
    setCurrentPage(currentPage - 1);
  }
  };

  // 3. حذف صورة محددة (بناءً على موقعها في المصفوفة الأصلية)
  const deleteSpecificImage = (originalIndex) => {
    setAllData(allData.filter((_, idx) => idx !== originalIndex));
  };

  // 4. تحميل الملف النهائي
  const downloadCSV = () => {
    if (allData.length === 0) return; // حماية من الانهيار
    const fields = Object.keys(allData[0]);
    const parser = new Parser({ fields });
    const csv = parser.parse(allData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned_products.csv';
    a.click();
  };

  return (
    <Stack sx={{ p: 4 ,width:'100%'}}>
      <PrimarySearchAppBar 
        upFile={handleFileUpload}
        downeFile={downloadCSV}
        length={allData.length }
        setPage={setCurrentPage} 
        totalPages={totalPages}/>
      <Typography variant="h2" gutterBottom>مدير المنتجات  </Typography>
    
      <Grid container spacing={1} width={'100%'}>
        {displayedHandles.map((handle) => (
          <Grid item xs={12} sm={6} md={4} key={handle}>
            <Card sx={{ p: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> 
                <IconButton color="error" onClick={() => deleteProductByHandle(handle)}><DeleteIcon /></IconButton>
              </Box>
              
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', p: 1 }}>
                {groupedProducts[handle].Images.map((img) => (
                  <Box key={img.index} sx={{ position: 'relative' }}>
                    <CardMedia component="img" height="80" image={img.src} sx={{ width: 100 }} />
                    <Button size="small" color="error" onClick={() => deleteSpecificImage(img.index)}>حذف</Button>
                  </Box>
                ))}
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* زر التحميل أسفل الجدول */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, my: 4, alignItems: 'center' }}>
        <Button variant="outlined" onClick={prevPage} disabled={currentPage === 0}>
          السابق
        </Button>
        <Typography>صفحة {currentPage + 1} من {totalPages}</Typography>
        <Button variant="outlined" onClick={nextPage} disabled={currentPage === totalPages - 1}>
          التالي
        </Button>
      </Box> 
    </Stack>
  );
}