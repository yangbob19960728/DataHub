import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tooltip } from 'primereact/tooltip';
import { Button } from 'primereact/button';
import axios from 'axios';
import copy from 'copy-to-clipboard';
import { AUTH_METHOD_OPTIONS } from '../constants/dropdownOptions';
import { useTranslation } from 'react-i18next';
import { InputSwitch } from 'primereact/inputswitch';
import { useHistory } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { Skeleton } from 'primereact/skeleton';




const DataIngestionTable = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedJob, setCopiedJob] = useState(null);
  const { t } = useTranslation();
  const history = useHistory();
  const toast = useRef(null);
  const authMethodMapping = useMemo(() => {
    return AUTH_METHOD_OPTIONS.reduce((map, option) => {
      map[option.code] = t(option.name)
      return map;
    }, {});
  }, []);
  const STATUS_MAP = useMemo(() => ({
    0: { label: 'Idle', className: 'text-white text-center', style: { backgroundColor: 'var(--gray-400)', borderRadius: '0.5rem' }, tooltip: t('homePage.schedulingNotEnabled') },
    1: { label: 'Error', className: 'text-white text-center', style: { backgroundColor: 'var(--red-400)', borderRadius: '0.5rem' }, },
    2: { label: 'Active', className: 'text-white text-center', style: { backgroundColor: 'var(--green-400)', borderRadius: '0.5rem' }, }
  }), [t]);
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 180000); // 3 mins
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(process.env.API_HOST + '/datahub/datastore-job');
      // throw new Error('test error');
      if (response.data?.data) {
        setJobs(transformData(response.data.data));
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      // 顯示錯誤Toast
      toast.current?.show({
        severity: 'error',
        summary: t('error.apiConnection'),
        detail: (error?.message) ? t('error.apiConnectionErrorMessage', { message: error?.message }) : t('error.unknownError'),
      });
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = (url, jobName) => {
    copy(url);
    setCopiedJob(jobName);
    setTimeout(() => setCopiedJob(null), 3000);
  };

  const shortUrl = (url) => {
    try {
      const u = new URL(url);
      return u.pathname;
    } catch {
      return url;
    }
  };
  const changeActivity = (rowData, value) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) => {
        if (job.job_name === rowData.job_name) {
          return { ...job, status: (value) ? 2 : 0, isActivity: value };
        }
        return job;
      }
      )
    );
  }
  const transformData = (data) => {
    return data.map((item) => {
      const transformedItem = { ...item };
      transformedItem.request_url = item.request_url;
      transformedItem.request_method = item.request_method;
      transformedItem.authorization_method = getAuthorizationMethod(item.authorization_method);
      transformedItem.interval = item.interval;
      transformedItem.data_processing_method = item.data_processing_method || '--';
      transformedItem.job_name = item.job_name;
      transformedItem.status = item.status;
      transformedItem.isActivity = item.isActivity || false;
      return transformedItem;
    });
  }
  const apiUrlBodyTemplate = (rowData) => {
    const url = rowData.request_url || '';
    const isCopied = copiedJob === rowData.job_name;
    return (
      <div className="flex items-center gap-2">
        <span title={url}>{shortUrl(url)}</span>
        <Button
          icon={isCopied ? 'pi pi-check' : 'pi pi-copy'}
          className="p-button-sm p-button-text"
          onClick={() => copyUrl(url, rowData.job_name)}
        />
      </div>
    );
  };
  const getAuthorizationMethod = (code) => {
    return authMethodMapping[code] || code;
  };


  const statusBodyTemplate = (rowData) => {
    const status = STATUS_MAP[rowData.status] || STATUS_MAP[0];
    return (
      <div className={`rounded px-2 py-1 ${status.className}`} style={status.style} data-pr-tooltip={status.tooltip}>
        {status.label}
        <Tooltip target="[data-pr-tooltip]" />
      </div>
    );
  };

  return (
    <div className="w-min-0">
      <h2 className='mb-5'>
        Data Ingestion
      </h2>
      <div className="flex justify-content-end mb-3">
        <Button label={t('homePage.create')} onClick={() => history.push('/dataHub/load-data/create')}></Button>
      </div>


      {!loading ? (<DataTable
        value={jobs}
        rows={10}
        paginator
        rowsPerPageOptions={[10, 25, 50]}
        sortMode="single"
        removableSort
        scrollable
      >
        <Column field="job_name" header="Data Store Name" sortable />
        <Column field="request_method" header="Method" sortable />
        <Column field="request_url" header="API URL" body={apiUrlBodyTemplate} sortable />
        <Column field="authorization_method" header="Auth Type" sortable />
        <Column field="interval" header="Interval" sortable />
        <Column field="data_processing_method" header="Processing" sortable />
        <Column header="Status" body={statusBodyTemplate} sortable />
        <Column header="Last Load" body={() => '--'} />
        <Column header="Actions" style={{ minWidth: 150 }} body={(rowData) => (
          <>
            <Button icon="pi pi-pencil" className="p-button-text p-button-sm" />
            <InputSwitch checked={rowData.isActivity} onChange={(e) => changeActivity(rowData, e.value)} />
          </>
        )} />
      </DataTable>) : (
        <Skeleton className='h-30rem' />
      )}
      <Toast ref={toast} />
    </div>
  );
};

export default DataIngestionTable;
