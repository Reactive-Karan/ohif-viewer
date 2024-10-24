import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MODULE_TYPES } from '@ohif/core';
import { extensionManager } from '../../App.tsx';
import { LoadingIndicatorProgress } from '@ohif/ui';
import filesToStudies from './filesToStudies';

const Local = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const dicomUrl = queryParams.get('dicomUrl');
  const studyInstanceUID = queryParams.get('StudyInstanceUIDs');

  const localDataSources = extensionManager.modules[MODULE_TYPES.DATA_SOURCE].reduce((acc, curr) => {
    const mods = [];
    curr.module.forEach(mod => {
      if (mod.type === 'localApi') {
        mods.push(mod);
      }
    });
    return acc.concat(mods);
  }, []);

  const firstLocalDataSource = localDataSources[0];
  const dataSource = firstLocalDataSource.createDataSource({});

  useEffect(() => {
    const fetchAndLoadDicomFile = async (fileUrl) => {
      setLoading(true);
      try {
        const encodedUrl = encodeURI(fileUrl);
        const response = await fetch(encodedUrl, { mode: 'no-cors' });
        if (!response.ok) {
          throw new Error(`Error fetching file from ${fileUrl}`);
        }
        const blob = await response.blob();
        const file = new File([blob], 'dicomFile.dcm', { type: blob.type });
        const studies = await filesToStudies([file], dataSource);

        const query = new URLSearchParams();
        studies.forEach(id => query.append('StudyInstanceUIDs', id));
        query.append('datasources', 'dicomlocal');

        setLoading(false);
        navigate(`/viewer/dicomlocal?${decodeURIComponent(query.toString())}`);
      } catch (err) {
        setLoading(false);
        setError(`Failed to load the DICOM file from ${fileUrl}: ${err.message}`);
      }
    };

    if (dicomUrl) {
      fetchAndLoadDicomFile(dicomUrl);
    } else if (studyInstanceUID) {
      // Directly load by StudyInstanceUID if provided
      const query = new URLSearchParams();
      query.append('StudyInstanceUIDs', studyInstanceUID);
      query.append('datasources', 'dicomlocal');
      navigate(`/viewer/dicomlocal?${decodeURIComponent(query.toString())}`);
    }
  }, [dicomUrl, studyInstanceUID, navigate]);

  if (loading) {
    return <LoadingIndicatorProgress className="h-full w-full bg-black" />;
  }

  return error ? <div>{error}</div> : null;
};

export default Local;
