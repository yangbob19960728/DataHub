import React, { useEffect, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import monaco from 'monaco-editor';
import { useDataIngestion } from '../../contexts/dataIngestionContext';
import jsonata from 'jsonata';
import { apiData } from './FieldMapping';
import { Skeleton } from 'primereact/skeleton';
const DataPreview = () => {
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { fieldMappings, updateFieldMapping, removeFieldMapping } = useDataIngestion();
  const [editorValue, setEditorValue] = useState(null);
  console.log('fieldMappings', fieldMappings);
  function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }
  function handleEditorWillMount(monaco: Monaco) {
    console.log('beforeMount: the monaco instance:', monaco);
  }
  function handleEditorValidation(markers: monaco.editor.IMarker[]) {
    console.log('onValidate:', markers);
  }
  useEffect(() => {
    const getPreviewData = async () => {
      const previewArray = await Promise.all(fieldMappings.map(async (mapping) => {
        const value = mapping.cleaningRule || mapping.data?.path?.join('.');
        const calculatedValue = await jsonata(value).evaluate(apiData);
        return { [mapping.targetField]: calculatedValue };
      }));
      console.log('previewArray', previewArray);
      const previewData = Object.assign({}, ...previewArray);
      return JSON.stringify(previewData, null, 2);
    }
    const fetchPreview = async () => {
      const preview = await getPreviewData();
      // 模擬延遲
      setTimeout(() => {
        setEditorValue(preview);
      }, 1000);

    };
    fetchPreview();
  }, []);
  return (
    <div className='col-10 mx-auto' style={{ height: '500px' }}>
      {editorValue !== null ? <div className='border-2 border-solid border-black-alpha-70 h-full'>
        <Editor
          height="100%"
          theme="vs-light"
          defaultLanguage="json"
          defaultValue={editorValue}
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          onValidate={handleEditorValidation}
          className='chart-config-editor'
        />
      </div>
        : <Skeleton width="100%" height="100%"></Skeleton>
      }
    </div>
  );
}

export default DataPreview;